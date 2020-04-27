'use strict'

/**
 * Creates an snapshot model.
 *
 * @param {Object} options
 * @return {Object}
 * @api public
 */

module.exports = async ({ db, collections = {} } = {}) => {

  const snapshots = await db.get(collections.snapshots || 'snapshots')

  /**
   * Load snapshots.
   *
   * @param {String|Number|Array} id
   * @return {Promise}
   * @public
   */

  const load = async id => {
    const docs = await snapshots.findMany({ _id: id }, {limit: 1, sort: '-revision' })
    const snap = Array.isArray(docs) ? docs[0] : docs
    if (snap) delete snap._id
    return snap
  }

  /**
   * Commit a single entity `snapshot`.
   *
   * @param {Entity} entity
   * @param {Object} options
   * @return {Promise}
   * @public
   */

  const save = async snap => {
    if(!snap) return
    const {_id, id, ...rest} = snap
    return snapshots.updateById(id, rest)
  }

  return { load, save }
}
