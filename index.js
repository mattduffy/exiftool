/**
 * @module @mattduffy/exiftool
 */

import { stat } from 'node:fs'
import Debug from 'debug'
const debug = Debug('exiftool:metadata')

/**
 * @todo [ ] create a class constructor method to initialize exiftool
 * @todo [ ] create an options object to set exiftool output behavior
 * @todo [ ] create class method to extract metadata using custom shortcut
 * @todo [ ] create class method to extract all metadata
 * @todo [ ] create a class method to extract arbitrary metadata
 * 
 */

/**
 * A class wrapping the exiftool metadata tool.
 * @summary A class wrapping the exiftool image metadata extraction tool.
 * @author mattduffy@gmail.com
 * @module @mattduffy/exiftool
 */
class Exiftool {
  /*
   * Create an instance of the exiftool wrapper.
   * @param { String } path - String value of file path to an image file or directory of images.
   */
  constructor( path ) {
    this._cwd = process.cwd()
    this._path = path
    this._isDirectory = stat(path, (err, stats) => { (!err) ? stats.isDirectory() : return false })
    this._opts = {}
    this._opts.exif_config = `-config ${this._cwd}/exiftool.config`
    this._opts.outputFormat = `-json`
    this._opts.gpsFormat = `-c "%.6f"`
    this._opts.includeTagFamily = `-G`
    this._opts.compactFormat = `-s3`

    
  }

  /**
   * Concatenate all the exiftool options together into a single string
   * @return { String } - Commandline options to exiftool.
   */
  getOptions() {
    return Object.values(this._opts).join(' ')
  }
}

export { Exiftool }
