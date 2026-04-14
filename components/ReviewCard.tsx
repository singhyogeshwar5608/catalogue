import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { Review } from '@/types';
import RatingStars from './RatingStars';

interface ReviewCardProps {
  review: Review;
  /** Softer card for dark / editorial sections (e.g. store testimonials strip). */
  elevated?: boolean;
}

function isLikelyImageUrl(value: string | undefined): boolean {
  const v = value?.trim();
  if (!v || v.length < 4) return false;
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:') || v.startsWith('/')) {
    return true;
  }
  return false;
}

const avatarFallbackClass =
  'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/90 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 shadow-sm ring-2 ring-white';

const avatarImageClass =
  'h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200/90 object-cover shadow-sm ring-2 ring-white';

export default function ReviewCard({ review, elevated = false }: ReviewCardProps) {
  const rawAvatar = review.userAvatar?.trim();
  const canTryImage = isLikelyImageUrl(rawAvatar);
  const [imageFailed, setImageFailed] = useState(false);
  const reviewerInitial = review.userName?.trim().charAt(0).toUpperCase();

  useEffect(() => {
    setImageFailed(false);
  }, [review.id, rawAvatar]);

  const showPhoto = Boolean(canTryImage && rawAvatar && !imageFailed);

  return (
    <div
      className={
        elevated
          ? 'rounded-2xl border border-violet-200/60 bg-gradient-to-br from-white via-violet-50/40 to-white p-5 shadow-lg shadow-violet-900/[0.08] ring-1 ring-violet-100/80'
          : 'rounded-lg border border-gray-200 bg-white p-4'
      }
    >
      <div className="flex items-start gap-3">
        {showPhoto ? (
          <img
            src={rawAvatar}
            alt={review.userName}
            className={avatarImageClass}
<<<<<<< HEAD
            loading="lazy"
            decoding="async"
=======
>>>>>>> origin/main
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={avatarFallbackClass} aria-hidden={reviewerInitial ? undefined : true}>
            {reviewerInitial ? (
              <span className="text-base font-bold tracking-tight">{reviewerInitial}</span>
            ) : (
              <User className="h-5 w-5 text-slate-500" aria-hidden="true" />
            )}
            <span className="sr-only">Reviewer avatar</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate font-semibold text-gray-900">{review.userName}</h4>
              <p className="text-xs text-gray-500">{new Date(review.reviewedAt).toLocaleDateString()}</p>
            </div>
            <div className="shrink-0">
              <RatingStars rating={review.rating} size="sm" />
            </div>
          </div>

          <p className="mb-3 text-sm leading-relaxed text-gray-700 [overflow-wrap:anywhere]">
            {review.comment}
          </p>

          {review.sellerReply && (
            <div className="min-w-0 rounded-lg border-l-4 border-primary bg-gray-50 p-3">
              <p className="mb-1 text-sm font-semibold text-gray-900">Seller Response</p>
              <p className="text-sm leading-relaxed text-gray-700 [overflow-wrap:anywhere]">
                {review.sellerReply.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {review.sellerReply.date
                  ? new Date(review.sellerReply.date).toLocaleDateString()
                  : new Date(review.reviewedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
