<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreSubscription;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class StoreSubscriptionController extends Controller
{
    public function show(Store $store)
    {
        $activeSubscription = $store->storeSubscriptions()
            ->with('plan')
            ->active()
            ->first();

        return $this->successResponse('Store subscription retrieved successfully.', [
            'activeSubscription' => $activeSubscription,
        ]);
    }

    public function activate(Request $request, Store $store)
    {
        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|exists:subscription_plans,id',
            'starts_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $plan = SubscriptionPlan::findOrFail($request->plan_id);

        if (!$plan->is_active) {
            return $this->errorResponse('This subscription plan is not available.', 400);
        }

        $existingActive = $store->storeSubscriptions()->active()->with('plan')->first();
        if ($existingActive && (int) $existingActive->subscription_plan_id === (int) $plan->id) {
            return $this->errorResponse('You are already on this plan.', 409);
        }

        $subscription = DB::transaction(function () use ($existingActive, $plan, $store, $request) {
            if ($existingActive) {
                $existingActive->update([
                    'status' => 'cancelled',
                    'auto_renew' => false,
                    'ends_at' => Carbon::now(),
                ]);
            }

            $startsAt = $request->starts_at ? Carbon::parse($request->starts_at) : Carbon::now();

            if (isset($plan->duration_days) && $plan->duration_days > 0) {
                $endsAt = $startsAt->copy()->addDays($plan->duration_days);
            } else {
                $endsAt = $plan->billing_cycle === 'monthly'
                    ? $startsAt->copy()->addMonth()
                    : $startsAt->copy()->addYear();
            }

            $subscription = StoreSubscription::create([
                'store_id' => $store->id,
                'subscription_plan_id' => $plan->id,
                'price' => $plan->price,
                'status' => 'active',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'auto_renew' => true,
                'activated_by' => auth()->id(),
            ]);

            return $subscription;
        });

        $subscription->load('plan');

        return $this->successResponse('Subscription activated successfully.', $subscription, 201);
    }

    public function cancel(StoreSubscription $subscription)
    {
        if ($subscription->status === 'cancelled') {
            return $this->errorResponse('Subscription is already cancelled.', 400);
        }

        $subscription->update([
            'status' => 'cancelled',
            'auto_renew' => false,
        ]);

        return $this->successResponse('Subscription cancelled successfully.', $subscription);
    }

    public function index()
    {
        $subscriptions = StoreSubscription::with(['store', 'plan', 'activatedBy'])
            ->orderByDesc('created_at')
            ->get();

        return $this->successResponse('Store subscriptions retrieved successfully.', $subscriptions);
    }
}
