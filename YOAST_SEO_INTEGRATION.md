# Yoast SEO Integration Guide

## Overview

This CRM now includes full integration with Yoast SEO for WooCommerce products. The AI content generation feature automatically creates SEO-optimized metadata that is compatible with Yoast SEO.

## Features

### 1. AI-Generated SEO Content
- **Meta Title**: SEO-optimized title (50-60 characters)
- **Meta Description**: Compelling description for search results (150-160 characters)
- **Focus Keyphrase**: Main keyword to target
- **Keywords**: 5-8 relevant keywords for the product

### 2. Yoast SEO Meta Fields
The integration uses standard Yoast SEO meta fields:
- `_yoast_wpseo_title`: SEO title
- `_yoast_wpseo_metadesc`: Meta description
- `_yoast_wpseo_focuskw`: Focus keyphrase
- `_yoast_wpseo_metakeywords`: Meta keywords (comma-separated)

### 3. Single Product SEO Generation
1. Navigate to any product detail page
2. Click "Générer avec IA" button
3. Review and edit the generated SEO content
4. Click "Appliquer la sélection" to apply changes
5. Save the product to persist SEO metadata

### 4. Batch SEO Generation
1. Go to the Products list page
2. Select multiple products using checkboxes
3. Click "Actions" dropdown and select "Générer contenu avec IA"
4. The system will generate and automatically save SEO content for all selected products

## Testing the Integration

Run the test script to verify the integration:

```bash
node test-yoast-seo.mjs
```

This will:
1. Generate SEO content for a test product
2. Update the product with Yoast SEO metadata
3. Verify the metadata was saved correctly

## Requirements

### WordPress/WooCommerce Side
1. **Yoast SEO Plugin**: Must be installed and activated
2. **WooCommerce Integration**: Yoast SEO WooCommerce add-on recommended
3. **REST API Access**: Ensure the WooCommerce REST API user has permission to update meta fields
4. **Meta Fields Exposure**: Yoast SEO fields should be exposed via REST API

### Configuration
Add to your WordPress theme's `functions.php` to ensure Yoast fields are available via REST API:

```php
// Expose Yoast SEO fields in REST API for products
add_filter('rest_prepare_product', function($response, $post, $request) {
    $meta_fields = ['_yoast_wpseo_title', '_yoast_wpseo_metadesc', '_yoast_wpseo_focuskw', '_yoast_wpseo_metakeywords'];
    
    foreach ($meta_fields as $field) {
        $response->data['yoast_meta'][$field] = get_post_meta($post->ID, $field, true);
    }
    
    return $response;
}, 10, 3);
```

## How It Works

### Content Generation Flow
1. User triggers AI generation (single or batch)
2. Gemini AI generates French SEO-optimized content
3. Content is formatted for Yoast SEO meta fields
4. Data is saved via WooCommerce REST API

### Data Structure
```javascript
// AI-generated SEO content
{
  metaTitle: "Titre optimisé pour le SEO",
  metaDescription: "Description convaincante pour les moteurs de recherche",
  keywords: ["mot-clé1", "mot-clé2", "mot-clé3"],
  focusKeyphrase: "phrase clé principale"
}

// Converted to Yoast meta_data
[
  { key: "_yoast_wpseo_title", value: "Titre optimisé pour le SEO" },
  { key: "_yoast_wpseo_metadesc", value: "Description convaincante..." },
  { key: "_yoast_wpseo_focuskw", value: "phrase clé principale" },
  { key: "_yoast_wpseo_metakeywords", value: "mot-clé1, mot-clé2, mot-clé3" }
]
```

## Troubleshooting

### SEO Data Not Saving
1. Check WooCommerce API permissions
2. Verify Yoast SEO is activated
3. Ensure meta fields are not protected
4. Check server logs for errors

### SEO Fields Not Visible in WordPress
1. Clear WordPress cache
2. Check Yoast SEO settings
3. Verify product edit screen shows Yoast metabox

### API Errors
- **401 Unauthorized**: Check API credentials
- **403 Forbidden**: User lacks permission to update meta fields
- **404 Not Found**: Product ID doesn't exist

## Future Enhancements
- Real-time SEO score integration
- Readability analysis
- Social media metadata generation
- Schema.org structured data support