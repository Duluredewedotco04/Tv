
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Category, Channel } from '../models/iptv.model';

@Injectable({
  providedIn: 'root',
})
export class IptvService {
  private http = inject(HttpClient);
  private readonly API_BASE = 'https://iptv-org.github.io/api';
  private readonly M3U_BASE = 'https://iptv-org.github.io/iptv';

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.API_BASE}/categories.json`).pipe(
      catchError(this.handleError<Category[]>('getCategories', []))
    );
  }

  getChannelsForCategory(categoryId: string): Observable<Channel[]> {
    const url = `${this.M3U_BASE}/categories/${categoryId}.m3u`;
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(m3uContent => this.parseM3U(m3uContent)),
      catchError(this.handleError<Channel[]>('getChannelsForCategory', []))
    );
  }

  private parseM3U(m3uContent: string): Channel[] {
    const channels: Channel[] = [];
    const lines = m3uContent.replace(/\r/g, '').split('\n');
    let currentChannelInfo: Partial<Channel> = {};

    for (const line of lines) {
      if (line.startsWith('#EXTINF:')) {
        const nameMatch = line.match(/,(.*)$/);
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        
        currentChannelInfo = {
          name: nameMatch ? nameMatch[1].trim() : 'Unknown Channel',
          logo: logoMatch ? logoMatch[1] : 'https://via.placeholder.com/150x84.png?text=No+Logo',
        };
      } else if (line.trim() && !line.startsWith('#')) {
        currentChannelInfo.url = line.trim();
        if (currentChannelInfo.name && currentChannelInfo.logo && currentChannelInfo.url) {
            channels.push(currentChannelInfo as Channel);
        }
        currentChannelInfo = {};
      }
    }
    return channels;
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
