/**
 * @module @mattduffy/exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 */

import { stat } from 'node:fs/promises'
import Debug from 'debug'
const debug = Debug('exiftool:metadata')
const util = require('node:util')
const cmd = util.promisify(require('node:child_process').exec)

/**
 * @todo [x] create a class constructor method to initialize exiftool
 * @todo [x] create an options object to set exiftool output behavior
 * @todo [ ] create class method to extract metadata using custom shortcut
 * @todo [ ] create class method to extract all metadata
 * @todo [ ] create a class method to extract arbitrary metadata
 * 
 */

/**
 * A class wrapping the exiftool metadata tool.
 * @summary A class wrapping the exiftool image metadata extraction tool.
 * @class Exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @module @mattduffy/exiftool
 */
export default class Exiftool {
  /**
   * Create an instance of the exiftool wrapper.
   * @param { string } path - String value of file path to an image file or directory of images.
   */
  constructor( path ) {
    this._cwd = process.cwd()
    this._path = path || null
    this._isDirectory = null
    this._opts = {}
    this._opts.exif_config = `-config ${this._cwd}/exiftool.config`
    this._opts.outputFormat = `-json`
    this._opts.gpsFormat = `-c "%.6f"`
    this._opts.shortcut = `-MattsShortcut`
    this._opts.includeTagFamily = `-G`
    this._opts.compactFormat = `-s3`
    this._opts.quite = `-q`
    this._opts.excludeTypes = `--ext TXT --ext JS  --ext JSON  --ext MJS --ext CJS --ext MD --ext HTML`
    this._command = `${this._executable} ${this.getOptions()} ${this._path}`
  }

  /**
   * Initializes some asynchronus properties.
   * @summary Initializes some asynchronus class properties not done in the constructor.
   * @author mattduffy@gmail.com
   * @async
   * @param { string } - A file system path to set for exiftool to process.
   * @return { Exiftool|boolean } - Returns fully initialized instance or false.
   */
  async init( path ) {
    if (('undefined' == typeof path) && (null == this._path)) {
      debug('Param: path - was undefined.')
      debug(`Instance property: path - ${this._path}`)
      return false
    } else if (path) {
      try {
        await this.setPath(path)
      } catch (e) {
        debug(e)
        return false
      }
    } 
    try {
      this._executable = await this.which()
      this._command = `${this._executable} ${this.getOptions()} ${this._path}`
    } catch (e) {
      debug(e)
    }
    return this
  }

  /**
   * Set the path for image file or directory of images to process with exiftool.
   * @summary Set the path of image file or directory of images to process with exiftool.
   * @author mattduffy@gmail.com
   * @async
   * @param { string } - A file system path to set for exiftool to process.
   * @return { Object } - Returns an object literal with success or error messages.
   */
  async setPath( path ) {
    let o = {value: null, error: null}
    try {
      this._path = path
      this._fileStats = await stat(path)
      this._isDirectory = this._fileStats.isDirectory()
      this._command = `${this._executable} ${this.getOptions()} ${this._path}`
      o.value = true
    } catch (e) {
      debug(e)
      o.error = e.message
      o.errorCode = e.code
      o.errorStack = e.stack
    }
    return o
  }

  /**
   * Concatenate all the exiftool options together into a single string.
   * @summary Concatenate all the exiftool options together into a single string.
   * @author mattduffy@gmail.com
   * @return { string } - Commandline options to exiftool.
   */
  getOptions() {
    return Object.values(this._opts).join(' ')
  }

  /**
   * Find the path to the executable exiftool binary.
   * @summary Find the path to the executable exiftool binary.
   * @author mattduffy@gmail.com
   * @async
   * @return { string|boolean } - File system path to exiftool binary or FALSE if not found.
   */
  async which() {
    try {
      let path = await cmd('which exiftool')
      if ('\n' == path.stdout.slice(-1)) {
        return path.stdout.slice(0,-1) 
      }
    } catch (e) {
      return false
    }
  }

  /**
   * Run the composed exiftool commend to get the requested exif metadata.
   * @summary Get the exif metadata for one or more image files.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @return { Object|Error } - JSON object literal of metadata or Error if failed.
   */
  async getMetadata() {
    try {
      let metadata = await cmd(this._command)
      if ('' != metadata.stderr) {
        throw new Exeception(metadata.stderr)
      }
      metadata = JSON.parse(metadata.stdout)
      debug(metadata)
      return metadata
    } catch (e) {
      debug(e)
      return e
    }
  }
}

