import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateFr'
})
export class DateFrPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
