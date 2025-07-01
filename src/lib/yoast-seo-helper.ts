import { SEOContent } from './gemini-service';

// Yoast SEO meta field keys
export const YOAST_META_KEYS = {
  TITLE: '_yoast_wpseo_title',
  META_DESC: '_yoast_wpseo_metadesc',
  FOCUS_KW: '_yoast_wpseo_focuskw',
  META_KEYWORDS: '_yoast_wpseo_metakeywords',
} as const;

// Convert AI-generated SEO content to Yoast SEO meta data format
export function formatSEOForYoast(seoContent: SEOContent): Array<{ key: string; value: string }> {
  const metaData: Array<{ key: string; value: string }> = [];

  if (seoContent.metaTitle) {
    metaData.push({
      key: YOAST_META_KEYS.TITLE,
      value: seoContent.metaTitle,
    });
  }

  if (seoContent.metaDescription) {
    metaData.push({
      key: YOAST_META_KEYS.META_DESC,
      value: seoContent.metaDescription,
    });
  }

  if (seoContent.focusKeyphrase) {
    metaData.push({
      key: YOAST_META_KEYS.FOCUS_KW,
      value: seoContent.focusKeyphrase,
    });
  }

  if (seoContent.keywords && seoContent.keywords.length > 0) {
    metaData.push({
      key: YOAST_META_KEYS.META_KEYWORDS,
      value: seoContent.keywords.join(', '),
    });
  }

  return metaData;
}

// Extract Yoast SEO data from product meta_data
export function extractYoastSEOData(metaData?: Array<{ id?: number; key: string; value: string }>): SEOContent | null {
  if (!metaData || metaData.length === 0) {
    return null;
  }

  const seoContent: SEOContent = {
    metaTitle: '',
    metaDescription: '',
    keywords: [],
    focusKeyphrase: '',
  };

  let hasData = false;

  metaData.forEach((meta) => {
    switch (meta.key) {
      case YOAST_META_KEYS.TITLE:
        seoContent.metaTitle = meta.value;
        hasData = true;
        break;
      case YOAST_META_KEYS.META_DESC:
        seoContent.metaDescription = meta.value;
        hasData = true;
        break;
      case YOAST_META_KEYS.FOCUS_KW:
        seoContent.focusKeyphrase = meta.value;
        hasData = true;
        break;
      case YOAST_META_KEYS.META_KEYWORDS:
        seoContent.keywords = meta.value.split(',').map(k => k.trim()).filter(k => k.length > 0);
        hasData = true;
        break;
    }
  });

  return hasData ? seoContent : null;
}