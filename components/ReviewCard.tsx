import { User } from 'lucide-react';
import { Review } from '@/types';
import RatingStars from './RatingStars';

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const hasAvatar = Boolean(review.userAvatar);
  const reviewerInitial = review.userName?.trim().charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        {hasAvatar ? (
          <img
            src={review.userAvatar}
            alt={review.userName}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 ring-1 ring-gray-200 flex items-center justify-center">
            {reviewerInitial ? (
              <span className="text-sm font-semibold">{reviewerInitial}</span>
            ) : (
              <User className="w-5 h-5" aria-hidden="true" />
            )}
            <span className="sr-only">Anonymous reviewer avatar</span>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-semibold text-gray-900">{review.userName}</h4>
              <p className="text-xs text-gray-500">{new Date(review.reviewedAt).toLocaleDateString()}</p>
            </div>
            <RatingStars rating={review.rating} size="sm" />
          </div>
          
          <p className="text-gray-700 mb-3">{review.comment}</p>
          
          {review.sellerReply && (
            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-primary">
              <p className="text-sm font-semibold text-gray-900 mb-1">Seller Response</p>
              <p className="text-sm text-gray-700">{review.sellerReply.message}</p>
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
