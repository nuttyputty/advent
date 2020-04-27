'use strict'

/**
 * Creates an event model.
 *
 * @param {Object} options
 * @return {Object}
 * @public
 */

module.exports = async ({ db, collections = {} } = {}) => {
  const events = await db.get(collections.events || 'events')

  await events.createIndex({ 'entity.id': 1, revision: 1 })
  await events.createIndex({ 'entity.id': 1 })
  await events.createIndex({ revision: 1 })


  /**
   * Load events.
   *
   * @param {Object} id
   * @param {Object} snap
   * @return {Promise}
   * @public
   */

  const load = (id, snap) => {
    const query =
      snap && snap.revision
        ? { 'entity.id': id, revision: { $gt: snap.revision } }
        : { 'entity.id': id }
    return events.findMany(query, { sort: 'revision' })
  }

  /**
   * Save events.
   *
   * @param {Array} events
   * @return {Promise}
   * @public
   */

  const save = async newEvnts => {
    if (!Array.isArray(newEvnts) || newEvnts.length === 0 || newEvnts.some(e=>!e.entity || !e.entity.id))
      return []

    return events.insertMany(newEvnts)
  }

  return { load, save }
}
