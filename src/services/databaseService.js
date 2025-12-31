const { getPool, sql } = require('../config/database');
const { generateDownloadUrl } = require('./downloadService');

/**
 * Upsert (insert or update) a game record
 */
async function upsertGame(game) {
  try {
    const pool = await getPool();
    
    // Check if game exists
    const checkQuery = 'SELECT id FROM games WHERE id = @id';
    const checkResult = await pool.request()
      .input('id', sql.Int, game.id)
      .query(checkQuery);
    
    const exists = checkResult.recordset.length > 0;
    
    if (exists) {
      // Update existing record
      const updateQuery = `
        UPDATE games
        SET 
          title = @title,
          icon_100 = @icon_100,
          group_name = @group_name,
          description = @description,
          type = @type,
          updated_at = @updated_at,
          short_description = @short_description,
          slug = @slug,
          download_url = @download_url,
          version = @version,
          size = @size,
          developer = @developer,
          category = @category,
          requirements = @requirements,
          bundle_id = @bundle_id,
          package_name = @package_name,
          screenshots_json = @screenshots_json,
          last_synced_at = GETDATE()
        WHERE id = @id
      `;
      
      const downloadUrl = generateDownloadUrl(game.id, game.slug);
      
      await pool.request()
        .input('id', sql.Int, game.id)
        .input('title', sql.NVarChar(500), game.title)
        .input('icon_100', sql.NVarChar(1000), game.icon_100 || null)
        .input('group_name', sql.NVarChar(50), game.group || null)
        .input('description', sql.NVarChar(sql.MAX), game.description || null)
        .input('type', sql.NVarChar(50), game.type || null)
        .input('updated_at', sql.DateTime2, game.updated_at ? new Date(game.updated_at) : null)
        .input('short_description', sql.NVarChar(sql.MAX), game.short_description || null)
        .input('slug', sql.NVarChar(500), game.slug || null)
        .input('download_url', sql.NVarChar(2000), downloadUrl)
        .input('version', sql.NVarChar(50), game.version || null)
        .input('size', sql.NVarChar(50), game.size || null)
        .input('developer', sql.NVarChar(255), game.developer || null)
        .input('category', sql.NVarChar(100), game.category || null)
        .input('requirements', sql.NVarChar(sql.MAX), game.requirements || null)
        .input('bundle_id', sql.NVarChar(255), game.bundle_id || null)
        .input('package_name', sql.NVarChar(255), game.package_name || null)
        .input('screenshots_json', sql.NVarChar(sql.MAX), Array.isArray(game.screenshots) ? JSON.stringify(game.screenshots) : (game.screenshots_json || null))
        .query(updateQuery);
      
      return { action: 'updated', id: game.id };
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO games (
          id, title, icon_100, group_name, description, type,
          updated_at, short_description, slug, download_url, 
          version, size, developer, category, requirements, 
          bundle_id, package_name, screenshots_json,
          created_at, last_synced_at
        )
        VALUES (
          @id, @title, @icon_100, @group_name, @description, @type,
          @updated_at, @short_description, @slug, @download_url,
          @version, @size, @developer, @category, @requirements,
          @bundle_id, @package_name, @screenshots_json,
          GETDATE(), GETDATE()
        )
      `;
      
      const downloadUrl = generateDownloadUrl(game.id, game.slug);
      
      await pool.request()
        .input('id', sql.Int, game.id)
        .input('title', sql.NVarChar(500), game.title)
        .input('icon_100', sql.NVarChar(1000), game.icon_100 || null)
        .input('group_name', sql.NVarChar(50), game.group || null)
        .input('description', sql.NVarChar(sql.MAX), game.description || null)
        .input('type', sql.NVarChar(50), game.type || null)
        .input('updated_at', sql.DateTime2, game.updated_at ? new Date(game.updated_at) : null)
        .input('short_description', sql.NVarChar(sql.MAX), game.short_description || null)
        .input('slug', sql.NVarChar(500), game.slug || null)
        .input('download_url', sql.NVarChar(2000), downloadUrl)
        .input('version', sql.NVarChar(50), game.version || null)
        .input('size', sql.NVarChar(50), game.size || null)
        .input('developer', sql.NVarChar(255), game.developer || null)
        .input('category', sql.NVarChar(100), game.category || null)
        .input('requirements', sql.NVarChar(sql.MAX), game.requirements || null)
        .input('bundle_id', sql.NVarChar(255), game.bundle_id || null)
        .input('package_name', sql.NVarChar(255), game.package_name || null)
        .input('screenshots_json', sql.NVarChar(sql.MAX), Array.isArray(game.screenshots) ? JSON.stringify(game.screenshots) : (game.screenshots_json || null))
        .query(insertQuery);
      
      return { action: 'inserted', id: game.id };
    }
  } catch (error) {
    console.error(`❌ Error upserting game ${game.id}:`, error.message);
    throw error;
  }
}

/**
 * Batch upsert multiple games
 */
async function upsertGames(games) {
  const results = {
    inserted: 0,
    updated: 0,
    failed: 0,
    errors: []
  };
  
  for (const game of games) {
    try {
      const result = await upsertGame(game);
      if (result.action === 'inserted') {
        results.inserted++;
      } else if (result.action === 'updated') {
        results.updated++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        gameId: game.id,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Get statistics about the games in database
 */
async function getStats() {
  try {
    const pool = await getPool();
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_games,
        COUNT(DISTINCT group_name) as total_groups,
        MIN(created_at) as first_created,
        MAX(last_synced_at) as last_synced
      FROM games
    `;
    
    const result = await pool.request().query(statsQuery);
    return result.recordset[0];
  } catch (error) {
    console.error('❌ Error getting stats:', error.message);
    throw error;
  }
}

/**
 * Get count by group
 */
async function getCountByGroup() {
  try {
    const pool = await getPool();
    
    const query = `
      SELECT 
        group_name,
        COUNT(*) as count
      FROM games
      GROUP BY group_name
      ORDER BY count DESC
    `;
    
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (error) {
    console.error('❌ Error getting count by group:', error.message);
    throw error;
  }
}

/**
 * Get games with pagination
 */
async function getGamesPaginated(page = 1, limit = 20, group = null, type = null) {
  try {
    const pool = await getPool();
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    if (group) {
      whereConditions.push(`group_name = @group`);
    }
    if (type) {
      whereConditions.push(`type = @type`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM games ${whereClause}`;
    const countRequest = pool.request();
    if (group) {
      countRequest.input('group', sql.NVarChar(50), group);
    }
    if (type) {
      countRequest.input('type', sql.NVarChar(50), type);
    }
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    // Get paginated results
    const dataQuery = `
      SELECT 
        id, title, icon_100, group_name, short_description, 
        slug, download_url, type, updated_at
      FROM games
      ${whereClause}
      ORDER BY updated_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    
    const dataRequest = pool.request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit);
    
    if (group) {
      dataRequest.input('group', sql.NVarChar(50), group);
    }
    if (type) {
      dataRequest.input('type', sql.NVarChar(50), type);
    }
    
    const dataResult = await dataRequest.query(dataQuery);
    
    return {
      games: dataResult.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error getting paginated games:', error.message);
    throw error;
  }
}

/**
 * Search games by title or description
 */
async function searchGames(query, page = 1, limit = 20) {
  try {
    const pool = await getPool();
    const offset = (page - 1) * limit;
    const searchPattern = `%${query}%`;
    const exactPattern = query;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM games 
      WHERE 
        title LIKE @query OR 
        short_description LIKE @query OR
        description LIKE @query OR
        developer LIKE @query OR
        category LIKE @query OR
        bundle_id LIKE @query OR
        package_name LIKE @query
    `;
    const countResult = await pool.request()
      .input('query', sql.NVarChar(sql.MAX), searchPattern)
      .query(countQuery);
    const total = countResult.recordset[0].total;
    
    // Get search results with weighting
    const dataQuery = `
      SELECT 
        id, title, icon_100, group_name, short_description, 
        slug, download_url, type, updated_at, developer, category, version, size
      FROM games
      WHERE 
        title LIKE @query OR 
        short_description LIKE @query OR
        description LIKE @query OR
        developer LIKE @query OR
        category LIKE @query OR
        bundle_id LIKE @query OR
        package_name LIKE @query
      ORDER BY 
        CASE 
          WHEN title = @exact THEN 1
          WHEN title LIKE @exact + '%' THEN 2
          WHEN title LIKE '%' + @exact + '%' THEN 3
          WHEN developer LIKE '%' + @exact + '%' THEN 4
          WHEN category LIKE '%' + @exact + '%' THEN 5
          ELSE 6
        END,
        updated_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    
    const dataResult = await pool.request()
      .input('query', sql.NVarChar(sql.MAX), searchPattern)
      .input('exact', sql.NVarChar(sql.MAX), exactPattern)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(dataQuery);
    
    return {
      games: dataResult.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error searching games:', error.message);
    throw error;
  }
}

/**
 * Get a single game by ID
 */
async function getGameById(id) {
  try {
    const pool = await getPool();
    
    const query = 'SELECT * FROM games WHERE id = @id';
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);
    
    return result.recordset[0] || null;
  } catch (error) {
    console.error(`❌ Error getting game ${id}:`, error.message);
    throw error;
  }
}

/**
 * Get recent games
 */
async function getRecentGames(limit = 10) {
  try {
    const pool = await getPool();
    
    const query = `
      SELECT TOP (@limit)
        id, title, icon_100, group_name, short_description, 
        slug, download_url, type, updated_at
      FROM games
      ORDER BY updated_at DESC
    `;
    
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query(query);
    
    return result.recordset;
  } catch (error) {
    console.error('❌ Error getting recent games:', error.message);
    throw error;
  }
}

/**
 * Get VIP games (sample)
 */
async function getVipGames(limit = 5) {
  try {
    const pool = await getPool();
    
    const query = `
      SELECT TOP (@limit)
        id, title, icon_100, group_name, short_description, 
        slug, download_url, type, updated_at
      FROM games
      WHERE title LIKE '%VIP%' OR short_description LIKE '%VIP%' OR group_name LIKE '%VIP%'
      ORDER BY updated_at DESC
    `;
    
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query(query);
    
    return result.recordset;
  } catch (error) {
    console.error('❌ Error getting VIP games:', error.message);
    return [];
  }
}

/**
 * Unified get games function
 */
async function getGames({ search, group, type, page = 1, limit = 20 }) {
  if (search) {
    return searchGames(search, page, limit);
  }
  return getGamesPaginated(page, limit, group, type);
}

/**
 * Update game details (partial update)
 */
async function updateGame(id, updates) {
  try {
    const pool = await getPool();
    const setClauses = [];
    const request = pool.request().input('id', sql.Int, id);

    if (updates.title !== undefined) {
      setClauses.push('title = @title');
      request.input('title', sql.NVarChar(500), updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = @description');
      request.input('description', sql.NVarChar(sql.MAX), updates.description);
    }
    if (updates.group !== undefined) {
      setClauses.push('group_name = @group');
      request.input('group', sql.NVarChar(50), updates.group);
    }
    if (updates.version !== undefined) {
      setClauses.push('version = @version');
      request.input('version', sql.NVarChar(50), updates.version);
    }
    if (updates.size !== undefined) {
      setClauses.push('size = @size');
      request.input('size', sql.NVarChar(50), updates.size);
    }
    if (updates.developer !== undefined) {
      setClauses.push('developer = @developer');
      request.input('developer', sql.NVarChar(255), updates.developer);
    }
    if (updates.category !== undefined) {
      setClauses.push('category = @category');
      request.input('category', sql.NVarChar(100), updates.category);
    }
    if (updates.requirements !== undefined) {
      setClauses.push('requirements = @requirements');
      request.input('requirements', sql.NVarChar(sql.MAX), updates.requirements);
    }
    if (updates.bundle_id !== undefined) {
      setClauses.push('bundle_id = @bundle_id');
      request.input('bundle_id', sql.NVarChar(255), updates.bundle_id);
    }
    if (updates.package_name !== undefined) {
      setClauses.push('package_name = @package_name');
      request.input('package_name', sql.NVarChar(255), updates.package_name);
    }
    if (updates.screenshots_json !== undefined) {
      setClauses.push('screenshots_json = @screenshots_json');
      request.input('screenshots_json', sql.NVarChar(sql.MAX), updates.screenshots_json);
    }
    
    // Always update updated_at
    setClauses.push('updated_at = GETDATE()');
    setClauses.push('last_synced_at = GETDATE()');

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE games
      SET ${setClauses.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const result = await request.query(query);
    return result.recordset[0];
  } catch (error) {
    console.error(`❌ Error updating game ${id}:`, error.message);
    throw error;
  }
}

module.exports = {
  upsertGame,
  upsertGames,
  getStats,
  getCountByGroup,
  getGamesPaginated,
  searchGames,
  getGameById,
  getRecentGames,
  getRecentGames,
  getVipGames,
  getGames,
  updateGame
};
