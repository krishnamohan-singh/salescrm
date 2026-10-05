<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Document;
use App\Models\DocumentFolder;
use App\Models\DocumentType;
use App\Models\Opportunity;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DocumentFolderController extends Controller
{
    public function index(Request $request)
    {
        $query = DocumentFolder::query()
            ->with(['parentFolder', 'creator'])
            ->where(function($q) {
                if (auth()->user()->type === 'company') {
                    $q->where('created_by', createdBy());
                } else {
                    // Staff users can see folders created by their company
                    $q->where('created_by', createdBy());
                }
            });

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Handle filters
        if ($request->filled('parent_folder_id') && $request->parent_folder_id !== 'all') {
            if ($request->parent_folder_id === 'null') {
                $query->whereNull('parent_folder_id');
            } else {
                $query->where('parent_folder_id', $request->parent_folder_id);
            }
        }

        // Handle sorting
        $sortField = $request->input('sort_field', 'id');
        $sortDirection = $request->input('sort_direction', 'desc');
        $allowedSorts=['id', 'name', 'created_at'];
        $allowedDirection = ['asc', 'desc'];
        if (!in_array($sortDirection, $allowedDirection)) {
            $sortDirection = 'desc';
        }
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        $perPage = max(1, min(100, (int) $request->get('per_page', 10)));
        $documentFolders = $query->paginate($perPage)->withQueryString();

        // Get data for dropdowns with parent folder name
        $parentFolders = DocumentFolder::where('created_by', createdBy())
            ->with('parentFolder')
            ->get(['id', 'name', 'parent_folder_id'])
            ->map(function ($folder) {
                $displayName = $folder->name;
                if ($folder->parentFolder) {
                    $displayName = $folder->parentFolder->name . ' / ' . $folder->name;
                }
                return [
                    'id' => $folder->id,
                    'name' => $folder->name,
                    'display_name' => $displayName
                ];
            });

        return Inertia::render('document-folders/index', [
            'documentFolders' => $documentFolders,
            'parentFolders' => $parentFolders,
            'filters' => $request->all(['search', 'parent_folder_id', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

   
    public function create()
    {
        $parentFolders = DocumentFolder::where('created_by', createdBy())
            ->get(['id', 'name']);

        return Inertia::render('document-folders/create', [
            'parentFolders' => $parentFolders,
        ]);
    }

   

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent_folder_id' => 'nullable|exists:document_folders,id',
            'description' => 'nullable|string',
        ]);

        // Validate unique name with parent_folder_id and created_by
        $exists = DocumentFolder::where('name', $validated['name'])
            ->where('parent_folder_id', $validated['parent_folder_id'] ?? null)
            ->where('created_by', createdBy())
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors(['name' => __('A folder with this name already exists in the selected location.')])->withInput();
        }

        // Set created_by to company ID for both company and staff users
        $validated['created_by'] = createdBy();

        // Validate parent folder belongs to same company if specified
        if (!empty($validated['parent_folder_id'])) {
            $parentFolder = DocumentFolder::where('id', $validated['parent_folder_id'])
                ->where('created_by', createdBy())
                ->first();

            if (!$parentFolder) {
                return redirect()->back()->with('error', __('Invalid parent folder selected.'));
            }
        }

        DocumentFolder::create($validated);

        return redirect()->back()->with('success', __('Document folder created successfully.'));
    }

     public function show($id)
    {
        $folder = DocumentFolder::where('id', $id)
            ->where('created_by', createdBy())
            ->first();

        if (!$folder) {
            return redirect()->route('documents.index')->with('error', __('Folder not found.'));
        }

        $folder->load(['parentFolder', 'subFolders']);

        $documents = Document::with(['account', 'folder', 'type', 'opportunity', 'assignedUser', 'media'])
            ->where('folder_id', $folder->id)
            ->where('created_by', createdBy())
            ->get();

        $parentFolders = DocumentFolder::where('created_by', createdBy())
            ->where('status', 'active')
            ->with('parentFolder')
            ->get(['id', 'name', 'parent_folder_id'])
            ->map(fn($f) => [
                'id'           => $f->id,
                'name'         => $f->name,
                'display_name' => $f->parentFolder ? $f->parentFolder->name . ' / ' . $f->name : $f->name,
            ])->all();

        return Inertia::render('documents/folder', [
            'folder'        => $folder,
            'documents'     => $documents,
            'parentFolders' => $parentFolders,
            'users'         => User::where('created_by', createdBy())->where('status', 'active')->select('id', 'name', 'email')->get(),
            'accounts'      => Account::where('created_by', createdBy())->select('id', 'name')->get(),
            'folders'       => DocumentFolder::where('created_by', createdBy())->select('id', 'name')->get(),
            'types'         => DocumentType::where('created_by', createdBy())->where('status', 'active')->select('id', 'type_name')->get(),
            'opportunities' => Opportunity::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get(),
        ]);
    }

     public function edit($id)
    {
        $documentFolder = DocumentFolder::where('id', $id)
            ->where('created_by', createdBy())
            ->firstOrFail();

        $parentFolders = DocumentFolder::where('created_by', createdBy())
            ->where('id', '!=', $id) // Exclude current folder to prevent circular reference
            ->get(['id', 'name']);

        return Inertia::render('document-folders/edit', [
            'documentFolder' => $documentFolder,
            'parentFolders' => $parentFolders,
        ]);
    }
    
    public function update(Request $request, $documentFolderId)
    {
        $documentFolder = DocumentFolder::where('id', $documentFolderId)
            ->where('created_by', createdBy())
            ->first();

        if ($documentFolder) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'parent_folder_id' => 'nullable|exists:document_folders,id',
                    'description' => 'nullable|string',
                ]);

                // Validate unique name with parent_folder_id and created_by
                $exists = DocumentFolder::where('name', $validated['name'])
                    ->where('parent_folder_id', $validated['parent_folder_id'] ?? null)
                    ->where('created_by', createdBy())
                    ->where('id', '!=', $documentFolderId)
                    ->exists();

                if ($exists) {
                    return redirect()->back()->withErrors(['name' => __('A folder with this name already exists in the selected location.')])->withInput();
                }

                $documentFolder->update($validated);

                return redirect()->back()->with('success', __('Document folder updated successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update document folder.'));
            }
        } else {
            return redirect()->back()->with('error', __('Document folder not found.'));
        }
    }

    public function destroy($documentFolderId)
    {
        $documentFolder = DocumentFolder::where('id', $documentFolderId)
            ->where('created_by', createdBy())
            ->first();

        if ($documentFolder) {
            try {
                $parentFolderId = $documentFolder->parent_folder_id;
                $documentFolder->delete();
                if ($parentFolderId) {
                    return redirect()->route('documents.folder', $parentFolderId)->with('success', __('Document folder deleted successfully.'));
                }
                return redirect()->route('documents.index')->with('success', __('Document folder deleted successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete document folder.'));
            }
        } else {
            return redirect()->route('documents.index')->with('error', __('Document folder not found.'));
        }
    }


    public function toggleStatus($documentFolderId)
    {
        $documentFolder = DocumentFolder::where('id', $documentFolderId)
            ->where('created_by', createdBy())
            ->first();

        if ($documentFolder) {
            try {
                $documentFolder->status = $documentFolder->status === 'active' ? 'inactive' : 'active';
                $documentFolder->save();

                return redirect()->back()->with('success', __('Document folder status updated successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update document folder status.'));
            }
        } else {
            return redirect()->back()->with('error', __('Document folder not found.'));
        }
    }
}
