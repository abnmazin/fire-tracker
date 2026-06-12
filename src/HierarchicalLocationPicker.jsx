import React, { useState, useMemo } from 'react';
import { MapPin, ChevronLeft, Plus } from 'lucide-react';

/**
 * A cascading hierarchical location picker.
 * Renders a series of dropdowns: one for each level of the tree.
 * 
 * Props:
 * - tree: TreeNode[] - The location tree
 * - value: string - The currently selected full path (e.g. "البصرة / مسجد الموسوي / المطبخ")
 * - onChange: (path: string) => void
 * - onAddLocation: (parentId: string|null, parentName: string) => void - called when user clicks + to add a new location
 * - disabled: boolean
 * - placeholder: string
 * - allowNonLeaf: boolean - if true, can select intermediate nodes (not just leaves)
 */
export default function HierarchicalLocationPicker({
  tree,
  value = '',
  onChange,
  onAddLocation,
  disabled = false,
  placeholder = 'اختر الموقع',
  allowNonLeaf = false,
}) {
  // Parse the current value to get the path segments
  const currentPath = value ? value.split(' / ').filter(Boolean) : [];

  // Track selected node ID at each level
  const [selectedIds, setSelectedIds] = useState(() => {
    const ids = [];
    let currentNodes = tree;
    for (const segment of currentPath) {
      const found = currentNodes.find((n) => n.name === segment);
      if (found) {
        ids.push(found.id);
        currentNodes = found.children || [];
      } else {
        break;
      }
    }
    return ids;
  });

  // When tree or value changes externally, sync selectedIds
  React.useEffect(() => {
    const pathSegs = value ? value.split(' / ').filter(Boolean) : [];
    const ids = [];
    let currentNodes = tree;
    for (const segment of pathSegs) {
      const found = currentNodes.find((n) => n.name === segment);
      if (found) {
        ids.push(found.id);
        currentNodes = found.children || [];
      } else {
        break;
      }
    }
    setSelectedIds(ids);
  }, [tree, value]);

  // Build the options for each level based on the current selections
  const levels = useMemo(() => {
    const result = [];
    let currentNodes = tree;

    for (let i = 0; i <= selectedIds.length; i++) {
      const currentSelection = selectedIds[i];
      const selectedAtThisLevel = currentNodes.find((n) => n.id === currentSelection);

      result.push({
        level: i,
        nodes: currentNodes,
        selectedId: currentSelection || null,
        hasChildren: selectedAtThisLevel ? (selectedAtThisLevel.children?.length > 0) : false,
        selectedNode: selectedAtThisLevel || null,
      });

      if (selectedAtThisLevel) {
        currentNodes = selectedAtThisLevel.children || [];
      } else {
        break;
      }
    }

    return result;
  }, [tree, selectedIds]);

  const handleSelect = (level, nodeId) => {
    const newIds = selectedIds.slice(0, level);
    newIds.push(nodeId);

    const pathParts = [];
    let currentNodes = tree;
    for (const id of newIds) {
      const node = currentNodes.find((n) => n.id === id);
      if (node) {
        pathParts.push(node.name);
        if (!allowNonLeaf && (!node.children || node.children.length === 0)) {
          setSelectedIds(newIds);
          onChange(pathParts.join(' / '));
          return;
        }
        if (allowNonLeaf) {
          setSelectedIds(newIds);
          onChange(pathParts.join(' / '));
          return;
        }
        currentNodes = node.children || [];
      }
    }

    setSelectedIds(newIds);
    if (allowNonLeaf) {
      onChange(pathParts.join(' / '));
    }
  };

  // Validate selection when tree changes
  React.useEffect(() => {
    let currentNodes = tree;
    let valid = true;
    for (const id of selectedIds) {
      const found = currentNodes.find((n) => n.id === id);
      if (!found) {
        valid = false;
        break;
      }
      currentNodes = found.children || [];
    }
    if (!valid && tree.length > 0) {
      setSelectedIds([]);
      onChange('');
    }
    if (tree.length === 0 && value) {
      setSelectedIds([]);
      onChange('');
    }
  }, [tree]);

  const handleAddClick = (level) => {
    if (!onAddLocation) return;
    const levelInfo = levels[level];
    if (!levelInfo) return;

    if (level === 0) {
      // Adding root-level location
      const name = prompt('أدخل اسم الموقع الجديد:');
      if (name && name.trim()) {
        onAddLocation(null, name.trim());
      }
    } else {
      // Adding child under the selected parent at the previous level
      const prevLevel = levels[level - 1];
      if (prevLevel && prevLevel.selectedNode) {
        const name = prompt(`أدخل اسم الموقع الفرعي الجديد داخل "${prevLevel.selectedNode.name}":`);
        if (name && name.trim()) {
          onAddLocation(prevLevel.selectedNode.id, name.trim());
        }
      } else {
        alert('الرجاء اختيار الموقع الأب أولاً.');
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* Display the selected path */}
      <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2 min-h-[40px]">
        <MapPin className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
        {value ? (
          <span className="font-medium text-gray-800">{value}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>

      {/* Cascading dropdowns */}
      <div className="space-y-2">
        {levels.map((level, idx) => (
          <div key={idx} className="flex items-center gap-1">
            {idx > 0 && (
              <ChevronLeft className="w-4 h-4 text-gray-400 shrink-0" />
            )}
            <select
              disabled={disabled || level.nodes.length === 0}
              value={level.selectedId || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) handleSelect(idx, val);
              }}
              className={`flex-1 border p-2 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white ${
                level.nodes.length === 0 ? 'text-gray-400' : 'text-gray-800'
              }`}
            >
              <option value="" disabled>
                {level.nodes.length === 0
                  ? '-- لا توجد خيارات --'
                  : `-- اختر ${idx === 0 ? 'الموقع الرئيسي' : 'الفرعي'} --`}
              </option>
              {level.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                  {node.children?.length > 0 ? ` (${node.children.length})` : ''}
                </option>
              ))}
            </select>

            {/* Add button - only if onAddLocation is provided */}
            {onAddLocation && (
              <button
                type="button"
                onClick={() => handleAddClick(idx)}
                className="p-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg transition-colors shrink-0"
                title={idx === 0 ? 'إضافة موقع رئيسي جديد' : 'إضافة موقع فرعي جديد'}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {levels.length === 1 && levels[0].nodes.length === 0 && tree.length > 0 && (
          <div className="text-xs text-gray-400 text-center py-1">
            لا توجد مواقع متاحة
          </div>
        )}
      </div>
    </div>
  );
}