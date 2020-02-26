'use strict'

/**
 * Creates an event model.
 *
 * @param {Object} options
 * @return {Object}
 * @public
 */

module.exports = async ({ db, collections = {} } = {}) => {
  const counts = await db.get(collections.counts || 'counts')
  const events = await db.get(collections.events || 'events')

  await events.createIndex({ 'entity.id': 1, revision: 1 })
  await events.createIndex({ 'entity.id': 1 })
  await events.createIndex({ revision: 1 })
  await counts.createIndex({ entity: 1 })

  /**
   * Get sequence number for versioning.
   *
   * @param {String} entity
   * @return {Number}
   * @private
   */

  const getSeq = async entity => {
    const doc = await counts.findOne({ entity })
    return doc ? doc.seq : 0
  }

  /**
   * Set sequence number for versioning.
   *
   * @param {String} entity
   * @param {Number} seq
   * @private
   */

  const setSeq = async (entity, seq) => {
    counts.updateOne({ entity }, {seq}, { upsert: true })
  }

  /**
   * Get number from the first event.
   *
   * @param {Array} data
   * @return {String}
   * @private
   */

  const getName = data => {
    const {entity} = [...data].pop()
    if (entity && entity.name && entity.id) {
      return `${entity.name}:${entity.id}`
    }

    return null
  }

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
      snap && snap.version
        ? { 'entity.id': id, revision: { $gt: snap.version } }
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

  const save = async data => {
    if (!Array.isArray(data) || data.length === 0) {
      return []
    }

    const name = getName(data)
    let seq = await getSeq(name)

    const _events = name ? data.map(event=>
      Object.assign(event, { revision: ++seq  })
    ) : []

    if (_events.length === 0 || _events.some(e=>e._id)) return []
    await setSeq(name, seq)
    return events.insertMany(_events)
  }

  return { load, save }
}
