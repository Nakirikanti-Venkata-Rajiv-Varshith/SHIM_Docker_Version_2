const fs = require('fs')
const path = require('path')

const MAX_LINES = 1000
const SLICE_LINES = 400

class CSVStorage {
  /**
   * @param {string} filepath - Absolute path to the CSV file
   * @param {string[]} headers - Column headers
   */
  constructor(filepath, headers) {
    this.filepath = filepath
    this.headers = headers
    this.count = 0
    this._ensureFile()
  }

  _ensureFile() {
    const dir = path.dirname(this.filepath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    if (!fs.existsSync(this.filepath)) {
      fs.writeFileSync(this.filepath, this.headers.join(',') + '\n', 'utf8')
      this.count = 0
    } else {
      try {
        const content = fs.readFileSync(this.filepath, 'utf8')
        const lines = content.split('\n').filter(l => l.trim())
        this.count = Math.max(0, lines.length - 1) // minus header row
      } catch {
        this.count = 0
      }
    }
  }

  /** Append a single record object to the CSV */
  append(record) {
    const row = this.headers.map(h => {
      const val = record[h]
      return val == null ? '' : String(val)
    })
    fs.appendFileSync(this.filepath, row.join(',') + '\n', 'utf8')
    this.count++

    if (this.count >= MAX_LINES) {
      this._trim()
    }
  }

  /** Remove the oldest SLICE_LINES data rows, reset count */
  _trim() {
    try {
      const content = fs.readFileSync(this.filepath, 'utf8')
      const lines = content.split('\n').filter(l => l.trim())
      const header = lines[0]
      const data = lines.slice(1) // skip header

      // Keep data after the first SLICE_LINES rows
      const kept = data.slice(SLICE_LINES)
      const newContent = [header, ...kept].join('\n') + '\n'
      fs.writeFileSync(this.filepath, newContent, 'utf8')
      this.count = kept.length
      console.log(`[CSVStorage] Trimmed ${SLICE_LINES} rows from ${path.basename(this.filepath)}, kept ${this.count}`)
    } catch (err) {
      console.error('[CSVStorage] Trim error:', err.message)
    }
  }

  /** Return all rows as array of objects */
  readAll() {
    try {
      const content = fs.readFileSync(this.filepath, 'utf8')
      const lines = content.split('\n').filter(l => l.trim())
      if (lines.length < 2) return []
      const hdrs = lines[0].split(',')
      return lines.slice(1).map(line => {
        const vals = line.split(',')
        return hdrs.reduce((obj, h, i) => {
          obj[h] = vals[i] ?? ''
          return obj
        }, {})
      })
    } catch {
      return []
    }
  }

  /** Return the last n rows as array of objects */
  readLast(n) {
    const all = this.readAll()
    return all.slice(-n)
  }
}

module.exports = CSVStorage
