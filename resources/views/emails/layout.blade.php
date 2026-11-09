<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', config('app.name'))</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #334155;
            background-color: #f1f5f9;
            margin: 0;
            padding: 0;
            width: 100% !important;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }

        .wrapper {
            width: 100%;
            background-color: #f1f5f9;
            padding: 30px 10px;
        }

        .container {
            max-width: 640px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .header {
            background-color: #ffffff;
            padding: 24px 20px;
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
        }

        .header img {
            max-height: 48px;
            max-width: 220px;
            height: auto;
            width: auto;
            display: block;
            margin: 0 auto;
            border: 0;
            outline: none;
        }

        .body-content {
            padding: 24px;
        }

        .footer {
            padding: 20px 24px 28px;
            font-size: 12px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            background-color: #fafbfc;
        }

        @media only screen and (max-width: 640px) {
            .wrapper {
                padding: 10px 0 !important;
            }
            .container {
                width: 100% !important;
                border-radius: 0 !important;
                border-left: none !important;
                border-right: none !important;
            }
            .body-content {
                padding: 16px !important;
            }
        }

        @yield('styles')
    </style>
</head>

<body style="background-color: #f1f5f9; margin: 0; padding: 0;">
    <div class="wrapper" style="background-color: #f1f5f9; padding: 30px 10px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <div class="container" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                        <div class="header" style="background-color: #ffffff; padding: 24px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                            @php
                                $headerLogoUrl = $companyLogo ?? (function_exists('getCompanyLogoUrl') ? getCompanyLogoUrl($companyId ?? null) : null);
                                $headerBrandName = $companyName ?? (function_exists('getCompanyName') ? getCompanyName($companyId ?? null) : config('app.name'));
                            @endphp
                            @if (!empty($headerLogoUrl))
                                <img src="{{ $headerLogoUrl }}" alt="{{ $headerBrandName }}" style="max-height: 48px; max-width: 220px; width: auto; height: auto; display: block; margin: 0 auto; border: 0; outline: none;">
                            @else
                                <div style="font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">{{ $headerBrandName }}</div>
                            @endif
                        </div>

                        <div class="body-content" style="padding: 24px;">
                            @yield('content')
                        </div>

                        <div class="footer" style="padding: 20px 24px 28px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; background-color: #fafbfc;">
                            <p style="margin: 0; line-height: 1.5;">@yield('footer', 'This is an automated email from ' . ($headerBrandName ?? config('app.name')))</p>
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </div>
</body>

</html>
