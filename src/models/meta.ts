/**
 * Metadata associated with an image/content item
 */
export interface Meta {
  // entityId of content
  entityId?: string;
  // path to content file
  contentPath: string;
  // mimeType from upload
  mimeType: string;
  // encoding from upload
  encoding: string;
  // file name used for upload
  fileName: string;
}

/**
 * Lookup table for images
 */
export interface MetaMap {
  [entityId: string]: Meta;
}
