import React, { useState } from 'react';
import {
  Plus, X, Edit3, ChevronDown, ChevronLeft, MapPin, Trash2, Save
} from 'lucide-react';
import { addNode, removeNode, updateNodeName, countNodes } from './locationUtils';

/**
 * Interactive tree manager for locations.
 * Allows adding, editing, and deleting nodes at any level.
 */
export default function LocationTreeManager({ tree, onChange }) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [addingToId, setAddingToId] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startAdd = (parentId) => {
    setAddingToId(parentId || 'ROOT');
    setNewNodeName('');
  };

  const cancelAdd = () => {
    setAddingToId(null);
    setNewNodeName('');
  };

  const confirmAdd = () => {
    if (!newNodeName.trim()) return;
    const parentId = addingToId === 'ROOT' ? null : addingToId;
    const newTree = addNode(tree, parentId, newNodeName.trim());
    onChange(newTree);
    cancelAdd();
    // Expand the parent to show the new node
    if (parentId) toggleExpand(parentId);
  };

  const startEdit = (id, name) => {
    setEditingId(id);
    setEditName(name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const confirmEdit = () => {
    if (!editName.trim() || !editingId) return;
    const newTree = updateNodeName(tree, editingId, editName.trim());
    onChange(newTree);
    cancelEdit();
  };

  const confirmDelete = (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
    const newTree = removeNode(tree, id);
    onChange(newTree);
  };

  const renderNode = (node, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isAdding = addingToId === node.id;
    const isEditing = editingId === node.id;

    return (
      <div key={node.id} className="select-none">
        {/* Node row */}
        <div
          className="flex items-center gap-1 py-1.5 px-2 rounded-lg transition-colors hover:bg-gray-100 group"
          style={{ marginRight: `${depth * 1.25}rem` }}
        >
          {/* Expand/collapse toggle */}
          <button
            onClick={() => toggleExpand(node.id)}
            className={`p-0.5 rounded text-gray-400 hover:text-gray-700 transition-colors ${
              hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Icon */}
          <MapPin className="w-4 h-4 text-gray-500 shrink-0" />

          {/* Name (or edit input) */}
          {isEditing ? (
            <div className="flex-1 flex items-center gap-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                className="flex-1 border border-blue-300 bg-blue-50 p-1 rounded text-sm outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
              />
              <button
                onClick={confirmEdit}
                className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                title="حفظ"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={cancelEdit}
                className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                title="إلغاء"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="flex-1 text-sm font-medium text-gray-800">
              {node.name}
              {hasChildren && (
                <span className="text-xs text-gray-400 mr-1">
                  ({node.children.length})
                </span>
              )}
            </span>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => startAdd(node.id)}
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title="إضافة فرعي"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => startEdit(node.id, node.name)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="تعديل الاسم"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => confirmDelete(node.id, node.name)}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="حذف"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Add new child input */}
        {isAdding && (
          <div
            className="flex items-center gap-1 py-1 px-2"
            style={{ marginRight: `${(depth + 1) * 1.25}rem` }}
          >
            <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <input
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAdd();
                if (e.key === 'Escape') cancelAdd();
              }}
              placeholder="اسم الموقع الجديد..."
              className="flex-1 border border-green-300 bg-green-50 p-1.5 rounded text-sm outline-none focus:ring-1 focus:ring-green-400"
              autoFocus
            />
            <button
              onClick={confirmAdd}
              disabled={!newNodeName.trim()}
              className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
              title="إضافة"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={cancelAdd}
              className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
              title="إلغاء"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="border-r-2 border-gray-200 mr-2 pr-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const isAddingRoot = addingToId === 'ROOT';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-blue-600" />
          شجرة المواقع
        </h3>
        <span className="text-xs text-gray-500">
          {countNodes(tree)} موقع
        </span>
      </div>

      {/* Tree */}
      <div className="p-3 max-h-96 overflow-y-auto">
        {tree.length === 0 && !isAddingRoot ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            لا توجد مواقع. أضف موقعاً رئيسياً أولاً.
          </div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}

        {/* Add root node input */}
        {isAddingRoot && (
          <div className="flex items-center gap-1 py-1 px-2 mt-2 bg-green-50 border border-green-200 rounded-lg">
            <MapPin className="w-4 h-4 text-green-500 shrink-0" />
            <input
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAdd();
                if (e.key === 'Escape') cancelAdd();
              }}
              placeholder="اسم الموقع الرئيسي..."
              className="flex-1 border border-green-300 bg-white p-1.5 rounded text-sm outline-none focus:ring-1 focus:ring-green-400"
              autoFocus
            />
            <button
              onClick={confirmAdd}
              disabled={!newNodeName.trim()}
              className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={cancelAdd}
              className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Add root node button (only if not already adding) */}
        {!isAddingRoot && (
          <button
            onClick={() => startAdd(null)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 p-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:text-green-600 hover:border-green-400 hover:bg-green-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة موقع رئيسي جديد
          </button>
        )}
      </div>
    </div>
  );
}