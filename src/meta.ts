/**
 * Metadata associated with an image/content item
 */
export type Meta = {
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
export type MetaMap = {
  [entityId: string]: Meta;
}
