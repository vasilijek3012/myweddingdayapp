import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'isFeatured',
  standalone: false
})
export class FeaturedPipe implements PipeTransform {
  transform(value: string | null | undefined): boolean {
    return !!value && new Date(value) > new Date();
  }
}
