import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MyReview, PostRef, Review, ReviewService } from '../../../core/services/review.service';

@Component({
  selector: 'app-reviews-section',
  standalone: false,
  templateUrl: './reviews-section.component.html',
  styleUrl: './reviews-section.component.scss'
})
export class ReviewsSectionComponent implements OnChanges {
  @Input() venueId?: number;
  @Input() bandId?: number;

  reviews: Review[] = [];
  count = 0;
  average = 0;
  myReview: MyReview | null = null;

  loading = true;
  saving = false;
  error = '';

  ratingInput = 0;
  hoverRating = 0;
  commentInput = '';

  readonly stars = [1, 2, 3, 4, 5];

  constructor(private reviewService: ReviewService, public auth: AuthService, private router: Router) {}

  ngOnChanges(): void {
    if (!this.postRef) return;
    this.loading = true;
    this.reviewService.getReviews(this.postRef).subscribe({
      next: res => { this.reviews = res.reviews; this.count = res.count; this.average = res.average; this.loading = false; },
      error: () => { this.loading = false; }
    });

    if (this.auth.isLoggedIn) {
      this.reviewService.getMyReview(this.postRef).subscribe(review => {
        this.myReview = review;
        this.ratingInput = review?.rating ?? 0;
        this.commentInput = review?.comment ?? '';
      });
    }
  }

  get postRef(): PostRef | null {
    if (this.venueId) return { venue_id: this.venueId };
    if (this.bandId) return { band_id: this.bandId };
    return null;
  }

  get returnUrl(): string {
    return this.router.url;
  }

  setRating(n: number): void {
    this.ratingInput = n;
  }

  submit(): void {
    if (!this.postRef || this.ratingInput < 1) return;
    this.saving = true;
    this.error = '';
    this.reviewService.submitReview(this.postRef, this.ratingInput, this.commentInput).subscribe({
      next: () => {
        this.saving = false;
        this.ngOnChanges();
      },
      error: err => {
        this.error = err.error?.message || 'Something went wrong';
        this.saving = false;
      }
    });
  }

  deleteMine(): void {
    if (!this.myReview) return;
    this.reviewService.deleteReview(this.myReview.id).subscribe(() => {
      this.myReview = null;
      this.ratingInput = 0;
      this.commentInput = '';
      this.ngOnChanges();
    });
  }
}
