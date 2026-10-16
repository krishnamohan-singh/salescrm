<?php

/**
 * Laravel - Built-in Server & Document Root Router
 */

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

$publicFile = __DIR__ . '/public' . $uri;

// If the requested static file exists in the public directory, serve it directly
if ($uri !== '/' && file_exists($publicFile) && !is_dir($publicFile)) {
    $mimeTypes = [
        'css'   => 'text/css',
        'js'    => 'application/javascript',
        'mjs'   => 'application/javascript',
        'json'  => 'application/json',
        'png'   => 'image/png',
        'jpg'   => 'image/jpeg',
        'jpeg'  => 'image/jpeg',
        'gif'   => 'image/gif',
        'svg'   => 'image/svg+xml',
        'webp'  => 'image/webp',
        'ico'   => 'image/x-icon',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf'   => 'font/ttf',
        'eot'   => 'application/vnd.ms-fontobject',
        'pdf'   => 'application/pdf',
        'mp4'   => 'video/mp4',
    ];

    $ext = strtolower(pathinfo($publicFile, PATHINFO_EXTENSION));
    $mimeType = $mimeTypes[$ext] ?? (function_exists('mime_content_type') ? mime_content_type($publicFile) : null) ?: 'application/octet-stream';

    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . filesize($publicFile));
    readfile($publicFile);
    exit;
}

require_once __DIR__ . '/public/index.php';
