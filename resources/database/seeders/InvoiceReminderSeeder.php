<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\InvoiceReminder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class InvoiceReminderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $invoices = Invoice::get();
        foreach ($invoices as $invoice) {
            $count=rand(1,3);
            for ($i = 0; $i < $count; $i++) {
                InvoiceReminder::create([
                    'invoice_id' => $invoice->id,
                    'sent_by' => $invoice->created_by,
                    'created_by' => $invoice->created_by,
                    'type' => 'email',
                    'created_at' => $invoice->created_at->addMinutes(2),
                    'updated_at' => $invoice->created_at->addMinutes(2),
                ]);
            }
        }

        $this->command->info('Invoices reminders created for all invoices!');
    }
}
