/**
 * Utility functions for hierarchical location tree management.
 * 
 * Tree node structure:
 * {
 *   id: string,
 *   name: string,
 *   children: TreeNode[]
 * }
 */

/** Generate a unique ID for a tree node */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
};

/** Convert flat array of location strings to tree structure */
export const flatToTree = (flatLocations) => {
  return flatLocations.map((name, idx) => ({
    id: `loc-${idx}-${generateId()}`,
    name: String(name).trim(),
    children: [],
  }));
};

/** Convert tree back to flat array of location names (for backward compatibility if needed) */
export const treeToFlat = (tree) => {
  const result = [];
  const walk = (nodes) => {
    nodes.forEach((node) => {
      result.push(node.name);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(tree);
  return result;
};

/**
 * Get the full path string from root to a node.
 * e.g. "البصرة / مسجد الموسوي / المطبخ"
 */
export const getNodePath = (tree, targetId) => {
  const walk = (nodes, path) => {
    for (const node of nodes) {
      const currentPath = [...path, node.name];
      if (node.id === targetId) return currentPath;
      if (node.children?.length) {
        const found = walk(node.children, currentPath);
        if (found) return found;
      }
    }
    return null;
  };
  const path = walk(tree, []);
  return path ? path.join(' / ') : '';
};

/** Find a node by ID in the tree */
export const findNodeById = (tree, targetId) => {
  for (const node of tree) {
    if (node.id === targetId) return node;
    if (node.children?.length) {
      const found = findNodeById(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
};

/** Add a child node under a parent node by parentId. If parentId is null, add to root. */
export const addNode = (tree, parentId, name) => {
  if (!name || !name.trim()) return tree;
  const newNode = { id: generateId(), name: name.trim(), children: [] };

  if (!parentId) {
    return [...tree, newNode];
  }

  const update = (nodes) =>
    nodes.map((node) => {
      if (node.id === parentId) {
        return { ...node, children: [...(node.children || []), newNode] };
      }
      if (node.children?.length) {
        return { ...node, children: update(node.children) };
      }
      return node;
    });

  return update(tree);
};

/** Remove a node by ID from the tree */
export const removeNode = (tree, targetId) => {
  const filterNodes = (nodes) =>
    nodes
      .filter((node) => node.id !== targetId)
      .map((node) => ({
        ...node,
        children: node.children?.length ? filterNodes(node.children) : [],
      }));

  return filterNodes(tree);
};

/** Update a node's name by ID */
export const updateNodeName = (tree, targetId, newName) => {
  if (!newName || !newName.trim()) return tree;
  const update = (nodes) =>
    nodes.map((node) => {
      if (node.id === targetId) {
        return { ...node, name: newName.trim() };
      }
      if (node.children?.length) {
        return { ...node, children: update(node.children) };
      }
      return node;
    });

  return update(tree);
};

/**
 * Get all leaf node IDs and their full paths.
 * Returns: [{ id, path: "البصرة / مسجد الموسوي / المطبخ" }]
 */
export const getAllLeafPaths = (tree) => {
  const result = [];
  const walk = (nodes, path) => {
    nodes.forEach((node) => {
      const currentPath = [...path, node.name];
      if (!node.children || node.children.length === 0) {
        result.push({ id: node.id, path: currentPath.join(' / ') });
      } else {
        walk(node.children, currentPath);
      }
    });
  };
  walk(tree, []);
  return result;
};

/**
 * Get all nodes at all levels with their paths (for filtering/selection lists).
 * Returns: [{ id, name, path, depth }]
 */
export const getAllNodePaths = (tree) => {
  const result = [];
  const walk = (nodes, path, depth) => {
    nodes.forEach((node) => {
      const currentPath = [...path, node.name];
      result.push({
        id: node.id,
        name: node.name,
        path: currentPath.join(' / '),
        depth,
      });
      if (node.children?.length) {
        walk(node.children, currentPath, depth + 1);
      }
    });
  };
  walk(tree, [], 0);
  return result;
};

/** Count total nodes in the tree */
export const countNodes = (tree) => {
  let count = 0;
  const walk = (nodes) => {
    nodes.forEach((node) => {
      count++;
      if (node.children?.length) walk(node.children);
    });
  };
  walk(tree);
  return count;
};

/** Serialize tree to JSON for Firestore */
export const serializeTree = (tree) => JSON.parse(JSON.stringify(tree));

/** Deserialize tree from JSON (deep clone) */
export const deserializeTree = (json) => JSON.parse(JSON.stringify(json || []));

/**
 * Convert the old flat location array to tree format if needed.
 * Returns: { tree: TreeNode[], wasConverted: boolean }
 */
export const migrateIfNeeded = (locations) => {
  // If it's already a tree (array of objects with id/name/children), use as-is
  if (
    Array.isArray(locations) &&
    locations.length > 0 &&
    typeof locations[0] === 'object' &&
    locations[0] !== null &&
    locations[0].id
  ) {
    return { tree: deserializeTree(locations), wasConverted: false };
  }
  // It's a flat array of strings, convert to tree
  if (Array.isArray(locations) && locations.length > 0 && typeof locations[0] === 'string') {
    return { tree: flatToTree(locations), wasConverted: true };
  }
  // Empty or invalid
  return { tree: [], wasConverted: false };
};