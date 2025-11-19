
import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy, viewChild, ElementRef, effect } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { IptvService } from './services/iptv.service';
import { Category, Channel } from './models/iptv.model';

declare const Hls: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
})
export class AppComponent implements OnInit, OnDestroy {
  private iptvService = inject(IptvService);

  // Signals for state management
  categories = signal<Category[]>([]);
  channels = signal<Channel[]>([]);
  selectedCategory = signal<Category | null>(null);
  selectedChannel = signal<Channel | null>(null);
  isLoadingCategories = signal<boolean>(true);
  isLoadingChannels = signal<boolean>(false);
  error = signal<string | null>(null);

  videoPlayer = viewChild<ElementRef<HTMLVideoElement>>('videoPlayer');
  private hls: any;

  constructor() {
    effect(() => {
      const channel = this.selectedChannel();
      const videoEl = this.videoPlayer()?.nativeElement;

      if (this.hls && videoEl && channel) {
        if (Hls.isSupported()) {
          this.hls.loadSource(channel.url);
          this.hls.attachMedia(videoEl);
          videoEl.play().catch(e => console.error('Autoplay was prevented.', e));
        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support on platforms like Safari
          videoEl.src = channel.url;
          videoEl.play().catch(e => console.error('Autoplay was prevented.', e));
        }
      }
    });
  }

  ngOnInit() {
    this.hls = new Hls();
    this.loadCategories();
  }
  
  ngOnDestroy() {
    if (this.hls) {
      this.hls.destroy();
    }
  }

  loadCategories() {
    this.isLoadingCategories.set(true);
    this.iptvService.getCategories().subscribe({
      next: (data) => {
        // Filter out empty or undesirable categories
        const filteredCategories = data.filter(c => c.name && c.id && c.name.toLowerCase() !== 'xxx');
        this.categories.set(filteredCategories);
        this.error.set(null);
      },
      error: (err) => {
        this.error.set('Failed to load categories. Please try again later.');
        console.error(err);
      },
      complete: () => this.isLoadingCategories.set(false),
    });
  }

  selectCategory(category: Category) {
    if (this.selectedCategory()?.id === category.id) return;

    this.selectedCategory.set(category);
    this.selectedChannel.set(null);
    this.channels.set([]);
    this.isLoadingChannels.set(true);
    this.error.set(null);

    this.iptvService.getChannelsForCategory(category.id).subscribe({
      next: (data) => {
        this.channels.set(data);
        if (data.length === 0) {
            this.error.set(`No channels found for "${category.name}".`);
        }
      },
      error: (err) => {
        this.error.set(`Failed to load channels for "${category.name}".`);
        console.error(err);
      },
      complete: () => this.isLoadingChannels.set(false),
    });
  }

  playChannel(channel: Channel) {
    this.selectedChannel.set(channel);
  }

  backToChannels() {
    this.selectedChannel.set(null);
    if(this.hls) {
        this.hls.stopLoad();
    }
  }
  
  handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'https://via.placeholder.com/150x84.png?text=No+Logo';
  }
}
