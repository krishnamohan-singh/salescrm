<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create super admin role
        $superAdminRole = Role::firstOrCreate(
            ['name' => 'superadmin', 'guard_name' => 'web'],
            [
                'label' => 'Super Admin',
                'description' => 'Super Admin has full access to all features',
                'created_by' => null,
            ]
        );

        // Create admin / company role
        $adminRole = Role::firstOrCreate(
            ['name' => 'company', 'guard_name' => 'web'],
            [
                'label' => 'Company',
                'description' => 'Company has access to manage buissness',
                'created_by' => null,
            ]
        );

        // Get all permissions
        $permissions = Permission::all();

        // Assign all permissions to super admin
        $superAdminRole->syncPermissions($permissions);

        // Assign specific permissions to company role
        $adminPermissions = Permission::whereIn('name', [
            // Dashboard
            'manage-dashboard',
            'view-admin-dashboard',
            'view-manager-dashboard',
            'view-salesperson-dashboard',

            // Attendance & Timesheet
            'manage-attendance',
            'view-attendance',
            'view-all-attendance',
            'create-attendance',
            'edit-attendance',
            'delete-attendance',
            'approve-attendance-requests',
            'export-attendance',

            // User Performance
            'manage-user-performance',
            'view-user-performance',

            // User Management
            'manage-users',
            'create-users',
            'edit-users',
            'delete-users',
            'view-users',
            'reset-password-users',
            'toggle-status-users',

            // Role Management
            'manage-roles',
            'create-roles',
            'edit-roles',
            'delete-roles',
            'view-roles',
            'view-permissions',

            // Plan Management
            'manage-plans',
            'view-plans',
            'manage-plan-requests',
            'manage-plan-orders',
            'view-plan-orders',
            'request-plans',
            'trial-plans',
            'subscribe-plans',

            // Referral
            'manage-referral',
            'manage-users-referral',
            'manage-setting-referral',
            'manage-payout-referral',
            'approve-payout-referral',
            'reject-payout-referral',

            // Settings
            'manage-email-settings',
            'manage-brand-settings',
            'manage-webhook-settings',
            'manage-settings',
            'manage-invoices-settings',
            'manage-quotes-settings',
            'manage-sales-orders-settings',

            // Media
            'manage-media',
            'manage-any-media',
            'manage-own-media',
            'create-media',
            'delete-media',
            'view-media',
            'download-media',

            // Calendar
            'manage-calendar',
            'view-calendar',

            // Language & Analytics
            'manage-language',
            'edit-language',
            'view-language',
            'view-landing-page',
            'manage-analytics',

            // Taxes
            'manage-taxes',
            'view-taxes',
            'create-taxes',
            'edit-taxes',
            'delete-taxes',
            'toggle-status-taxes',

            // Brands
            'manage-brands',
            'view-brands',
            'create-brands',
            'edit-brands',
            'delete-brands',
            'toggle-status-brands',

            // Categories
            'manage-categories',
            'view-categories',
            'create-categories',
            'edit-categories',
            'delete-categories',
            'toggle-status-categories',

            // Products
            'manage-products',
            'view-products',
            'create-products',
            'edit-products',
            'delete-products',
            'toggle-status-products',
            'import-products',
            'export-products',

            // Contacts
            'manage-contacts',
            'manage-all-contacts',
            'view-contacts',
            'view-all-contacts',
            'create-contacts',
            'edit-contacts',
            'delete-contacts',
            'toggle-status-contacts',
            'export-contacts',

            // Accounts
            'manage-accounts',
            'manage-all-accounts',
            'view-accounts',
            'view-all-accounts',
            'create-accounts',
            'edit-accounts',
            'delete-accounts',
            'toggle-status-accounts',
            'export-accounts',

            // Account Types
            'manage-account-types',
            'view-account-types',
            'create-account-types',
            'edit-account-types',
            'delete-account-types',
            'toggle-status-account-types',

            // Account Industries
            'manage-account-industries',
            'view-account-industries',
            'create-account-industries',
            'edit-account-industries',
            'delete-account-industries',
            'toggle-status-account-industries',
            'manage-accounts',
            'view-accounts',
            'create-accounts',
            'edit-accounts',
            'delete-accounts',
            'toggle-status-accounts',
            'export-accounts',
            'manage-contacts',
            'view-contacts',
            'create-contacts',
            'edit-contacts',
            'delete-contacts',
            'toggle-status-contacts',
            'export-contacts',
            'manage-lead-statuses',
            'view-lead-statuses',
            'create-lead-statuses',
            'edit-lead-statuses',
            'delete-lead-statuses',
            'toggle-status-lead-statuses',

            // Lead Sources
            'manage-lead-sources',
            'view-lead-sources',
            'create-lead-sources',
            'edit-lead-sources',
            'delete-lead-sources',
            'toggle-status-lead-sources',

            // Leads
            'manage-leads',
            'manage-all-leads',
            'view-leads',
            'view-all-leads',
            'create-leads',
            'edit-leads',
            'delete-leads',
            'convert-leads',
            'toggle-status-leads',
            'import-leads',
            'export-leads',

            // Opportunity Stages
            'manage-opportunity-stages',
            'view-opportunity-stages',
            'create-opportunity-stages',
            'edit-opportunity-stages',
            'delete-opportunity-stages',
            'toggle-status-opportunity-stages',

            // Opportunity Sources
            'manage-opportunity-sources',
            'view-opportunity-sources',
            'create-opportunity-sources',
            'edit-opportunity-sources',
            'delete-opportunity-sources',
            'toggle-status-opportunity-sources',

            // Opportunities
            'manage-opportunities',
            'manage-all-opportunities',
            'view-opportunities',
            'view-all-opportunities',
            'create-opportunities',
            'edit-opportunities',
            'delete-opportunities',
            'toggle-status-opportunities',
            'export-opportunities',

            // Campaign Types
            'manage-campaign-types',
            'view-campaign-types',
            'create-campaign-types',
            'edit-campaign-types',
            'delete-campaign-types',
            'toggle-status-campaign-types',

            // Target Lists
            'manage-target-lists',
            'view-target-lists',
            'create-target-lists',
            'edit-target-lists',
            'delete-target-lists',
            'toggle-status-target-lists',

            // Campaigns
            'manage-campaigns',
            'view-campaigns',
            'create-campaigns',
            'edit-campaigns',
            'delete-campaigns',
            'toggle-status-campaigns',

            // Shipping Provider Types
            'manage-shipping-provider-types',
            'view-shipping-provider-types',
            'create-shipping-provider-types',
            'edit-shipping-provider-types',
            'delete-shipping-provider-types',
            'toggle-status-shipping-provider-types',

            // Cases
            'manage-cases',
            'view-cases',
            'create-cases',
            'edit-cases',
            'delete-cases',
            'toggle-status-cases',
            'export-cases',

            // Quotes
            'manage-quotes',
            'view-quotes',
            'create-quotes',
            'edit-quotes',
            'delete-quotes',
            'toggle-status-quotes',
            'export-quotes',

            // Sales Orders
            'manage-sales-orders',
            'view-sales-orders',
            'create-sales-orders',
            'edit-sales-orders',
            'delete-sales-orders',
            'toggle-status-sales-orders',
            'export-sales-orders',

            // Invoices
            'manage-invoices',
            'view-invoices',
            'create-invoices',
            'edit-invoices',
            'delete-invoices',
            'toggle-status-invoices',
            'export-invoices',
            'send-reminder-invoices',

            // Delivery Orders
            'manage-delivery-orders',
            'view-delivery-orders',
            'create-delivery-orders',
            'edit-delivery-orders',
            'delete-delivery-orders',
            'toggle-status-delivery-orders',
            'export-delivery-orders',

            // Return Orders
            'manage-return-orders',
            'view-return-orders',
            'create-return-orders',
            'edit-return-orders',
            'delete-return-orders',
            'export-return-orders',

            // Purchase Orders
            'manage-purchase-orders',
            'view-purchase-orders',
            'create-purchase-orders',
            'edit-purchase-orders',
            'delete-purchase-orders',
            'toggle-status-purchase-orders',
            'export-purchase-orders',

            // Receipt Orders
            'manage-receipt-orders',
            'view-receipt-orders',
            'create-receipt-orders',
            'edit-receipt-orders',
            'delete-receipt-orders',
            'toggle-status-receipt-orders',
            'export-receipt-orders',

            // Projects
            'manage-projects',
            'manage-all-projects',
            'view-projects',
            'view-all-projects',
            'create-projects',
            'edit-projects',
            'delete-projects',
            'toggle-status-projects',
            'export-projects',

            // Project Tasks
            'manage-project-tasks',
            'manage-all-project-tasks',
            'view-project-tasks',
            'view-all-project-tasks',
            'create-project-tasks',
            'edit-project-tasks',
            'delete-project-tasks',
            'export-project-tasks',
            'move-project-task',

            // Universal Tasks
            'manage-tasks',
            'manage-all-tasks',
            'view-tasks',
            'view-all-tasks',
            'create-tasks',
            'edit-tasks',
            'delete-tasks',

            // Target Management
            'manage-targets',
            'manage-all-targets',
            'view-targets',
            'view-all-targets',
            'create-targets',
            'edit-targets',
            'delete-targets',
            'allocate-targets',
            'export-targets',

            // Sales Day Plans
            'manage-sales-day-plans',
            'manage-all-sales-day-plans',
            'view-sales-day-plans',
            'view-all-sales-day-plans',
            'create-sales-day-plans',
            'edit-sales-day-plans',
            'delete-sales-day-plans',
            'send-sales-day-plans',
            'review-sales-day-plans',
            'approve-sales-day-plans',
            'export-sales-day-plans',

            // Task Statuses
            'manage-task-statuses',
            'view-task-statuses',
            'create-task-statuses',
            'edit-task-statuses',
            'delete-task-statuses',
            'toggle-status-task-statuses',

            // Meetings
            'manage-meetings',
            'view-meetings',
            'create-meetings',
            'edit-meetings',
            'delete-meetings',
            'toggle-status-meetings',

            // Calls
            'manage-calls',
            'view-calls',
            'create-calls',
            'edit-calls',
            'delete-calls',
            'toggle-status-calls',

            // Documents
            'create-document-folders',
            'edit-document-folders',
            'delete-document-folders',
            'manage-document-types',
            'view-document-types',
            'create-document-types',
            'edit-document-types',
            'delete-document-types',
            'toggle-status-document-types',
            'manage-documents',
            'view-documents',
            'create-documents',
            'edit-documents',
            'delete-documents',
            'toggle-status-documents',

            // Streams
            'manage-stream',
            'view-stream',
            'delete-stream',

            // Reports
            'manage-reports',
            'view-lead-reports',
            'view-sales-reports',
            'view-product-reports',
            'view-customer-reports',
            'view-project-reports',

            // Notification Templates
            'manage-notification-templates',
            'view-notification-templates',
            'create-notification-templates',
            'edit-notification-templates',
            'delete-notification-templates',

            // Notes
            'manage-notes',
            'view-notes',
            'create-notes',
            'edit-notes',
            'delete-notes',

            // Announcement Categories
            'manage-announcement-categories',
            'view-announcement-categories',
            'create-announcement-categories',
            'edit-announcement-categories',
            'delete-announcement-categories',
            'toggle-status-announcement-categories',

            // Announcements
            'manage-announcements',
            'view-announcements',
            'create-announcements',
            'edit-announcements',
            'delete-announcements',
            'toggle-status-announcements',

            // Login History
            'manage-login-history',
            'show-login-history',
            'delete-login-history',

            // Target Management
            'manage-targets',
            'manage-all-targets',
            'view-targets',
            'view-all-targets',
            'create-targets',
            'edit-targets',
            'delete-targets',
            'allocate-targets',
            'export-targets',

            // Sales Day Plans
            'manage-sales-day-plans',
            'manage-all-sales-day-plans',
            'view-sales-day-plans',
            'view-all-sales-day-plans',
            'create-sales-day-plans',
            'edit-sales-day-plans',
            'delete-sales-day-plans',
            'send-sales-day-plans',
            'review-sales-day-plans',
            'approve-sales-day-plans',
            'export-sales-day-plans',
        ])->get();

        $adminRole->syncPermissions($adminPermissions);
    }
}
