/**
 * @module @mattduffy/exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file which.js An ESM module exporting the local file system path to exiftool.
 */
import { promisify } from 'node:util'
import { exec } from 'node:child_process'

const cmd = promisify(exec)
async function which() {
  const output = await cmd('which exiftool')
  return output.stdout.trim()
}
export const path = await which()
