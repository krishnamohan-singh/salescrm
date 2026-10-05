<?php

namespace App\Models;


class Permission extends BaseSpatiePermission
{
    protected $fillable = [
        'module',
        'name',
        'label',
        'description',
        'guard_name'
    ];
}