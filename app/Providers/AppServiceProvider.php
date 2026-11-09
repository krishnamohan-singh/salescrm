<?php

namespace App\Providers;

use App\Models\User;
use App\Models\Plan;
use App\Models\Lead;
use App\Models\Account;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\SalesOrder;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\Contact;
use App\Models\Task;
use App\Models\LeadTask;
use App\Observers\UserObserver;
use App\Observers\PlanObserver;
use App\Observers\LeadObserver;
use App\Observers\AccountObserver;
use App\Observers\ContactObserver;
use App\Observers\OpportunityObserver;
use App\Observers\QuoteObserver;
use App\Observers\SalesOrderObserver;
use App\Observers\InvoiceObserver;
use App\Observers\PurchaseOrderObserver;
use App\Observers\TaskObserver;
use App\Providers\AssetServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\WebhookService::class);

        // Permanently disable Inertia SSR network calls (cPanel does not run Node SSR daemon on port 13714)
        $this->app->bind(\Inertia\Ssr\Gateway::class, function () {
            return new class implements \Inertia\Ssr\Gateway {
                public function dispatch(array $page): ?\Inertia\Ssr\Response {
                    return null;
                }
            };
        });

        // Register our AssetServiceProvider
        $this->app->register(AssetServiceProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // SuperAdmin and Company Admin have full access to do anything across the entire CRM
        Gate::before(function ($user, $ability) {
            $userType = strtolower($user->type ?? '');
            if (in_array($userType, ['superadmin', 'super admin', 'company', 'admin'])) {
                return true;
            }
            if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['superadmin', 'super admin', 'company', 'admin', 'Superadmin', 'Super Admin', 'Company', 'Admin'])) {
                return true;
            }
            return null;
        });

        // Register the UserObserver
        User::observe(UserObserver::class);

        // Register the PlanObserver
        Plan::observe(PlanObserver::class);

        // Register the LeadObserver
        Lead::observe(LeadObserver::class);

        // Register the AccountObserver
        Account::observe(AccountObserver::class);

        // Register the ContactObserver
        Contact::observe(ContactObserver::class);

        // Register the OpportunityObserver
        Opportunity::observe(OpportunityObserver::class);

        // Register the QuoteObserver
        Quote::observe(QuoteObserver::class);

        // Register the SalesOrderObserver
        SalesOrder::observe(SalesOrderObserver::class);

        // Register the InvoiceObserver
        Invoice::observe(InvoiceObserver::class);

        // Register the PurchaseOrderObserver
        PurchaseOrder::observe(PurchaseOrderObserver::class);

        // Register the TaskObserver for universal tasks and legacy lead tasks
        Task::observe(TaskObserver::class);
        LeadTask::observe(TaskObserver::class);

        // Configure dynamic storage disks
        try {
            \App\Services\DynamicStorageService::configureDynamicDisks();
        } catch (\Exception $e) {
            // Silently fail during migrations or when database is not ready
        }
    }
}
