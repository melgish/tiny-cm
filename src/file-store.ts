import { join, parse } from 'path';
import { existsSync, createWriteStream } from 'fs';
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';

import { v1 } from 'uuid';
import { Meta, MetaMap } from './models/meta';

import { logger } from './logger';

export class FileStore {
  /**
   * Data path is the folder where files will be stored.
   */
  private readonly dataPath: string;

  /**
   * Meta path is a JSON file containing all the metadata.
   */
  private readonly metaPath: string;

  /**
   * Holds the metadata in memory.
   */
  private metaData: MetaMap;

  /**
   * Tracks when metaData file requires flushing to disk.
   */
  private dirty: boolean;

  /**
   * Flush interval.
   */
  private interval: NodeJS.Timeout;

  /**
   * Gets the number of items in the store.
   */
  get size(): number {
    return Object.keys(this.metaData).length;
  }

  /**
   * Gets all values currently in the store.
   */
  get values(): Meta[] {
    return Object.values(this.metaData);
  }

  /**
   * Consstruct instance of a store.
   *
   * @param dataPath Path to files.  Defaults to temporary storage if not supplied.
   */
  constructor(dataPath: string) {
    // If no path specified, use /tmp/tiny-cm as test storage.
    this.dataPath = dataPath;
    this.metaPath = join(this.dataPath, 'metadata.json');
    this.metaData = {};
    this.dirty = false;
    this.interval = null;
  }

  /**
   * Call to shutdown refresh timeer
   */
  async close(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    await this.flush(true);
  }

  /**
   * Create a new record in the store from the supplied stream.
   *
   * @param file  content being uploaded
   * @param fileName original name of file being uploaded
   * @param encoding encoding of file
   * @param mimeType mime type of file
   * @return Promise resolved when complete
   */
  async create(
    file: NodeJS.ReadableStream,
    fileName: string,
    encoding: string,
    mimeType: string,
    entityId?: string
  ): Promise<Meta> {
    // There is no guarantee that filenames posted will be unique, so use a
    // UUID to store the file. Preserve the file extension for convenience.
    const ext = parse(fileName).ext || '';
    const id = v1();
    const contentPath = join(this.dataPath, id + ext);
    // Create new meta entry.
    const meta = { entityId, contentPath, encoding, mimeType, fileName };
    return new Promise<Meta>((resolve, reject) => {
      // When successful, resolve with metadata.
      file.on('end', async () => resolve(this.update(meta)));
      // On error, clean up and reject.
      file.on('error', async (err) => {
        await unlink(contentPath);
        reject(err);
      });
      file.pipe(createWriteStream(contentPath));
    });
  }

  /**
   * Delete an existing image.
   *
   * @param entityId ID to delete
   *
   * @returns Promise resolved on completion of delete
   */
  async delete(entityId: string): Promise<void> {
    const meta = await this.find(entityId);
    if (meta) {
      await unlink(meta.contentPath);
      // Remove from the index.
      delete this.metaData[entityId];
      this.dirty = true;
    }
  }

  /**
   * Lookup record in the store
   * @param entityId ID to query
   * @returns Promise
   *  Resolves to metadata when found.
   *  Resolves to null when not found.
   */
  async find(entityId: string): Promise<Meta> {
    return this.metaData[entityId];
  }

  /**
   * Writes the current metadata instance to the store.
   * @param force forces write to disk.
   */
  async flush(force = false): Promise<void> {
    if (this.dirty || force) {
      this.dirty = false;

      const data = JSON.stringify(this.metaData);
      await writeFile(this.metaPath, data);

      // Output some debug info
      logger.debug(`Wrote ${this.size} keys to store.`);
    }
  }

  /**
   * Initializes the store into memory.
   */
  async init(): Promise<this> {
    // Make sure the root path exists.
    if (!existsSync(this.dataPath)) {
      await mkdir(this.dataPath, { recursive: true });
      logger.info(`Created ${this.dataPath}.`);
    }

    // Make sure metadata file exists.
    if (!existsSync(this.metaPath)) {
      await this.flush(true);
      logger.info(`Created ${this.metaPath}.`);
    }

    // Read all metadata
    const data = await readFile(this.metaPath);
    this.metaData = JSON.parse(data.toString());
    logger.debug(`Read ${this.size} keys from store.`);

    // Update metadata on disk once per minute.
    this.interval = setInterval(this.flush.bind(this), 60000, false);

    return this;
  }

  /**
   * Updates the store and sets dirty flag
   * @param meta optional metadata to update
   */
  update(meta: Meta): Meta {
    // Don't update store unless meta includes entityId
    if (meta.entityId) {
      this.metaData[meta.entityId] = meta;
      this.dirty = true;
    }
    return meta;
  }

  /**
   * Return a list of all values in the local store
   */
  list(): Meta[] {
    return Object.values(this.metaData);
  }
}
