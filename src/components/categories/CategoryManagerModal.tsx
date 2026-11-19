'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/services/budget';
import type { Category, CategoryType } from '@/types/database';
import {
  Tag,
  Plus,
  Trash2,
  X,
  Check,
  AlertCircle,
  FolderOpen,
  Pencil,
} from 'lucide-react';
import { ICON_COMPONENTS, ICONS_LIST } from '@/lib/icons';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void;
}

const PALETTE_COLORS = [
  '#10B981', // Emerald
  '#059669', // Dark green
  '#3B82F6', // Blue
  '#60A5FA', // Light blue
  '#818CF8', // Indigo
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#64748B', // Slate
];

export function CategoryManagerModal({
  isOpen,
  onClose,
  onCategoriesChanged,
}: CategoryManagerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [colorHex, setColorHex] = useState(PALETTE_COLORS[0]);
  const [icon, setIcon] = useState(ICONS_LIST[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setErrorMessage(null);
    }
  }, [isOpen, loadCategories]);

  if (!isOpen || !mounted) return null;

  const handleStartEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setColorHex(cat.color_hex);
    setIcon(cat.icon || ICONS_LIST[0]);
    setIsAdding(true);
    setErrorMessage(null);
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingCategory(null);
    setName('');
    setType('EXPENSE');
    setColorHex(PALETTE_COLORS[0]);
    setIcon(ICONS_LIST[0]);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setFormLoading(true);
    setErrorMessage(null);
    try {
      if (editingCategory) {
        const updated = await updateCategory(editingCategory.id, {
          name: name.trim(),
          type,
          color_hex: colorHex,
          icon,
        });

        if (updated) {
          handleCancelForm();
          await loadCategories();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('finances-categories-changed'));
            window.dispatchEvent(new CustomEvent('finances-data-changed'));
          }
          onCategoriesChanged?.();
        }
      } else {
        const created = await createCategory({
          name: name.trim(),
          type,
          color_hex: colorHex,
          icon,
        });

        if (created) {
          handleCancelForm();
          await loadCategories();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('finances-categories-changed'));
            window.dispatchEvent(new CustomEvent('finances-data-changed'));
          }
          onCategoriesChanged?.();
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro ao salvar categoria.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    setErrorMessage(null);
    if (!confirm(`Deseja realmente excluir a categoria "${catName}"?`)) return;

    const res = await deleteCategory(id);
    if (!res.success) {
      setErrorMessage(res.error || 'Não foi possível excluir a categoria.');
    } else {
      if (editingCategory?.id === id) {
        handleCancelForm();
      }
      await loadCategories();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('finances-categories-changed'));
        window.dispatchEvent(new CustomEvent('finances-data-changed'));
      }
      onCategoriesChanged?.();
    }
  };

  const getTypeLabel = (t: CategoryType) => {
    switch (t) {
      case 'INCOME':
        return { label: 'Receita', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' };
      case 'FIXED_EXPENSE':
        return { label: 'Mensalidade Fixa', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' };
      case 'EXPENSE':
        return { label: 'Despesa Variável', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' };
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="flex flex-col w-full max-w-lg max-h-[90vh] rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <Tag className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Gerenciar Categorias
              </h2>
              <span className="text-xs text-zinc-500">
                Personalize as cores, ícones e nomes para o orçamento
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* List of categories */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-xs font-semibold text-zinc-600">Nenhuma categoria cadastrada</p>
            </div>
          ) : (
            categories.map((cat) => {
              const { label, color } = getTypeLabel(cat.type);
              const CatIcon = ICON_COMPONENTS[cat.icon] || Tag;
              const isEditingThis = editingCategory?.id === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    isEditingThis
                      ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-zinc-100 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0 shadow-xs"
                      style={{
                        backgroundColor: `${cat.color_hex}22`,
                        color: cat.color_hex,
                      }}
                    >
                      <CatIcon className="h-4 w-4" />
                    </div>
                    <span className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {cat.name}
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className={`p-1.5 transition-colors cursor-pointer rounded-lg ${
                        isEditingThis
                          ? 'text-emerald-500 bg-emerald-500/10'
                          : 'text-zinc-400 hover:text-emerald-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                      }`}
                      title="Editar categoria"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                      title="Excluir categoria"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add/Edit Category Collapsible / Form */}
        <div className="p-5 border-t border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/60">
          {!isAdding ? (
            <button
              onClick={() => {
                setEditingCategory(null);
                setIsAdding(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 py-2.5 text-xs font-semibold text-zinc-700 hover:border-emerald-500 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Adicionar Nova Categoria
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  {editingCategory ? (
                    <>
                      <Pencil className="h-3.5 w-3.5 text-emerald-500" />
                      Editar Categoria
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 text-emerald-500" />
                      Nova Categoria
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome (ex: Streaming, Pets...)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                />

                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CategoryType)}
                  className="rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                >
                  <option value="EXPENSE" className="bg-zinc-900 text-zinc-100">Despesa Variável</option>
                  <option value="FIXED_EXPENSE" className="bg-zinc-900 text-zinc-100">Mensalidade Fixa</option>
                  <option value="INCOME" className="bg-zinc-900 text-zinc-100">Receita / Ganhos</option>
                </select>
              </div>

              {/* Color Palette Picker */}
              <div>
                <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Cor da Categoria
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PALETTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColorHex(c)}
                      className={`h-6 w-6 rounded-full transition-transform cursor-pointer ${
                        colorHex === c ? 'scale-125 ring-2 ring-zinc-900 dark:ring-white' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Visual Selector */}
              <div>
                <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Ícone Sugerido
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ICONS_LIST.map((ic) => {
                    const IconComp = ICON_COMPONENTS[ic] || Tag;
                    const isSelected = icon === ic;

                    return (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setIcon(ic)}
                        title={ic}
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'scale-110 shadow-xs'
                            : 'border-zinc-200/80 bg-zinc-100/60 text-zinc-600 hover:bg-zinc-200/70 dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                        }`}
                        style={
                          isSelected
                            ? {
                                borderColor: colorHex,
                                color: colorHex,
                                backgroundColor: `${colorHex}25`,
                              }
                            : {}
                        }
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="rounded-xl px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  {editingCategory ? 'Cancelar Edição' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  {editingCategory ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
