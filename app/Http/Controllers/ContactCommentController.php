<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContactComment;
use App\Models\ContactActivity;
use Illuminate\Http\Request;

class ContactCommentController extends Controller
{
    public function store(Request $request, $contactId)
    {
        try {
            $contact = Contact::where('id', $contactId)
                ->where('created_by', createdBy())
                ->first();

            if (!$contact) {
                return redirect()->back()->with('error', __('Contact not found.'));
            }

            $validated = $request->validate([
                'comment' => 'required|string|max:1000',
            ]);

            $comment = ContactComment::create([
                'contact_id' => $contact->id,
                'comment' => $validated['comment'],
                'user_id' => auth()->id(),
                'created_by' => createdBy(),
            ]);

            // Create activity entry
            ContactActivity::create([
                'contact_id' => $contact->id,
                'user_id' => auth()->id(),
                'activity_type' => 'comment',
                'title' => auth()->user()->name . ' added a comment',
                'description' => $validated['comment'],
                'created_by' => createdBy(),
            ]);

            return redirect()->back()->with('success', __('Comment added successfully.'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to add comment: :error', ['error' => $e->getMessage()]));
        }
    }

    public function update(Request $request, $contactId, $commentId)
    {
        $contact = Contact::where('id', $contactId)
            ->where('created_by', createdBy())
            ->first();

        if (!$contact) {
            return redirect()->back()->with('error', __('Contact not found.'));
        }

        $comment = ContactComment::where('id', $commentId)
            ->where('contact_id', $contact->id)
            ->where('user_id', auth()->id())
            ->first();

        if (!$comment) {
            return redirect()->back()->with('error', __('Comment not found.'));
        }

        $validated = $request->validate([
            'comment' => 'required|string',
        ]);

        $comment->update($validated);

        return redirect()->back()->with('success', __('Comment updated successfully.'));
    }

    public function updateActivity(Request $request, $contactId, $activityId)
    {
        $contact = Contact::where('id', $contactId)
            ->where('created_by', createdBy())
            ->first();

        if (!$contact) {
            return redirect()->back()->with('error', __('Contact not found.'));
        }

        $activity = ContactActivity::where('id', $activityId)
            ->where('contact_id', $contact->id)
            ->where('user_id', auth()->id())
            ->where('activity_type', 'comment')
            ->first();

        if (!$activity) {
            return redirect()->back()->with('error', __('Comment not found.'));
        }

        $validated = $request->validate([
            'comment' => 'required|string|max:1000',
        ]);

        $activity->update([
            'description' => $validated['comment']
        ]);

        return redirect()->back()->with('success', __('Comment updated successfully.'));
    }

    public function destroy($contactId, $commentId)
    {
        $contact = Contact::where('id', $contactId)
            ->where('created_by', createdBy())
            ->first();

        if (!$contact) {
            return redirect()->back()->with('error', __('Contact not found.'));
        }

        $comment = ContactComment::where('id', $commentId)
            ->where('contact_id', $contact->id)
            ->where('user_id', auth()->id())
            ->first();

        if (!$comment) {
            return redirect()->back()->with('error', __('Comment not found.'));
        }

        $comment->delete();

        return redirect()->back()->with('success', __('Comment deleted successfully.'));
    }
}
