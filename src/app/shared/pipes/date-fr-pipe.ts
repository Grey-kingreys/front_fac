import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateFr',
  standalone: true,
})
export class DateFrPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, format: 'short' | 'long' | 'datetime' = 'short'): string {
    if (!value) return '—';
    
    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) return '—';

    const options: Intl.DateTimeFormatOptions = 
      format === 'datetime' 
        ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : format === 'long'
        ? { day: '2-digit', month: 'long', year: 'numeric' }
        : { day: '2-digit', month: 'short', year: 'numeric' };

    return date.toLocaleDateString('fr-FR', options);
  }
}