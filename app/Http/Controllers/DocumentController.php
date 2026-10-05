<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\User;
use App\Models\Account;
use App\Models\DocumentFolder;
use App\Models\DocumentType;
use App\Models\Opportunity;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DocumentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $folderQuery = DocumentFolder::where('created_by', createdBy())
            ->whereNull('parent_folder_id')
            ->with('subFolders');

        if ($request->filled('search')) {
            $folderQuery->where('name', 'like', '%' . $request->search . '%');
        }

        $rootFolders = $folderQuery->orderBy('name')->paginate(24)->withQueryString();

        $parentFolders = DocumentFolder::where('created_by', createdBy())
            ->whereNull('parent_folder_id')
            ->select('id', 'name')
            ->orderBy('name')
            ->get()
            ->toArray();

        return Inertia::render('documents/index', [
            'rootFolders'   => $rootFolders,
            'parentFolders' => $parentFolders,
            'filters'       => $request->only(['search', 'page']),
            // 'users'         => User::where('created_by', createdBy())->where('status', 'active')->select('id', 'name', 'email')->get(),
            // 'accounts'      => Account::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get(),
            // 'folders'       => DocumentFolder::where('created_by', createdBy())->select('id', 'name')->get(),
            // 'types'         => DocumentType::where('created_by', createdBy())->where('status', 'active')->select('id', 'type_name')->get(),
            // 'opportunities' => Opportunity::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $users = \App\Models\User::where('created_by', createdBy())->select('id', 'name', 'email')->get();

        $accounts = Account::where('created_by', createdBy())->select('id', 'name')->get();

        $folders = DocumentFolder::where('created_by', createdBy())->select('id', 'name')->get();

        $types = DocumentType::where('created_by', createdBy())->select('id', 'type_name')->get();

        $opportunities = Opportunity::where('created_by', createdBy())->select('id', 'name')->get();

        return Inertia::render('documents/create', [
            'users' => $users,
            'accounts' => $accounts,
            'folders' => $folders,
            'types' => $types,
            'opportunities' => $opportunities,
        ]);
    }
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'account_id' => 'required|exists:accounts,id',
            'folder_id' => 'required|exists:document_folders,id',
            'type_id' => 'required|exists:document_types,id',
            'opportunity_id' => 'required|exists:opportunities,id',
            'status' => 'nullable|in:active,inactive',
            'publish_date' => 'nullable|date|before_or_equal:expiration_date',
            'expiration_date' => 'nullable|date|after_or_equal:publish_date',
            'attachment' => 'required|exists:media,id',
            'description' => 'nullable|string',
            'assigned_to' => 'required|exists:users,id',
        ]);

        $document = Document::create([
            'name' => $request->name,
            'account_id' => $request->account_id,
            'folder_id' => $request->folder_id,
            'type_id' => $request->type_id,
            'opportunity_id' => $request->opportunity_id,
            'status' => $request->status ?? 'active',
            'publish_date' => $request->publish_date,
            'expiration_date' => $request->expiration_date,
            'attachment' => $request->attachment,
            'description' => $request->description,
            'created_by' => createdBy(),
            'assigned_to' => $request->assigned_to,
        ]);

        return redirect()->back()
            ->with('success', __('Document created successfully.'));
    }

    /**
     * Display the specified resource.
     */
    public function show($documentId)
    {
        $document = Document::find($documentId);
        if (!$document) {
            return redirect()->route('documents.index')->with('error', __('Document not found.'));
        }
        $document->load(['account', 'folder', 'type', 'opportunity', 'creator', 'assignedUser', 'media']);

        return Inertia::render('documents/show', [
            'document'      => $document,
            'users'         => User::where('created_by', createdBy())->select('id', 'name', 'email')->get(),
            'accounts'      => Account::where('created_by', createdBy())->select('id', 'name')->get(),
            'folders'       => DocumentFolder::where('created_by', createdBy())->select('id', 'name')->get(),
            'types'         => DocumentType::where('created_by', createdBy())->select('id', 'type_name')->get(),
            'opportunities' => Opportunity::where('created_by', createdBy())->select('id', 'name')->get(),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Document $document)
    {
        $users = \App\Models\User::where('created_by', createdBy())->select('id', 'name', 'email')->get();

        $accounts = Account::where('created_by', createdBy())->select('id', 'name')->get();

        $folders = DocumentFolder::where('created_by', createdBy())->select('id', 'name')->get();

        $types = DocumentType::where('created_by', createdBy())->select('id', 'type_name')->get();

        $opportunities = Opportunity::where('created_by', createdBy())->select('id', 'name')->get();

        return Inertia::render('documents/edit', [
            'document' => $document,
            'users' => $users,
            'accounts' => $accounts,
            'folders' => $folders,
            'types' => $types,
            'opportunities' => $opportunities,
        ]);
    }
    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Document $document)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'account_id' => 'required|exists:accounts,id',
            'folder_id' => 'required|exists:document_folders,id',
            'type_id' => 'required|exists:document_types,id',
            'opportunity_id' => 'required|exists:opportunities,id',
            'status' => 'nullable|in:active,inactive',
            'publish_date' => 'nullable|date|before_or_equal:expiration_date',
            'expiration_date' => 'nullable|date|after_or_equal:publish_date',
            'attachment' => 'required|exists:media,id',
            'description' => 'nullable|string',
            'assigned_to' => 'required|exists:users,id',
        ]);

        $document->update([
            'name' => $request->name,
            'account_id' => $request->account_id,
            'folder_id' => $request->folder_id,
            'type_id' => $request->type_id,
            'opportunity_id' => $request->opportunity_id,
            'status' => $request->status,
            'publish_date' => $request->publish_date,
            'expiration_date' => $request->expiration_date,
            'attachment' => $request->attachment,
            'description' => $request->description,
            'assigned_to' => $request->assigned_to,
        ]);

        // Handle attachment update only if changed
        if ($request->has('attachment')) {
            $currentMedia = $document->getFirstMedia('attachments');
            $currentUrl = $currentMedia ? $currentMedia->getUrl() : null;

            // Only update if attachment URL has changed
            if ($request->attachment !== $currentUrl) {
                try {
                    $document->clearMediaCollection('attachments');
                    if ($request->filled('attachment')) {
                        $document->addMediaFromUrl($request->attachment)
                            ->toMediaCollection('attachments');
                    }
                } catch (\Exception $e) {
                    \Log::error('Document attachment upload failed: ' . $e->getMessage());
                }
            }
        }

        return redirect()->back()
            ->with('success', __('Document updated successfully.'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Document $document)
    {
        $folderId = $document->folder_id;
        $document->delete();

        if ($folderId) {
            return redirect()->route('documents.folder', $folderId)->with('success', __('Document deleted successfully.'));
        }
        return redirect()->route('documents.index')->with('success', __('Document deleted successfully.'));
    }

    /**
     * Toggle the status of the specified resource.
     */
    public function toggleStatus(Document $document)
    {
        $newStatus = $document->status === 'active' ? 'inactive' : 'active';
        $document->update(['status' => $newStatus]);

        return redirect()->back()
            ->with('success', __('Document status updated successfully.'));
    }

    /**
     * Download the document attachment.
     */
    public function download($documentId)
    {
        $document = Document::find($documentId);
        if (!$document) {
            return redirect()->route('documents.index')->with('error', __('Document not found.'));
        }
        if ($document->attachment) {
            $media = \Spatie\MediaLibrary\MediaCollections\Models\Media::find($document->attachment);
            if (!$media) {
                abort(404, __('File not found'));
            }
            return response()->download($media->getPath(), $media->file_name);
        }
        $media = $document->getFirstMedia('attachments');
        if (!$media) {
            abort(404, __('File not found'));
        }

        return response()->download($media->getPath(), $media->file_name);
    }
}
