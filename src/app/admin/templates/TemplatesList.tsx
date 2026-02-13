'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Eye, EyeOff, Clock, Layers, ExternalLink } from 'lucide-react';
import { Card, Button, ConfirmModal } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  description: string | null;
  estimated_duration_minutes: number;
  is_published: boolean;
  created_at: string;
  module_count: number;
}

export function TemplatesList({ templates: initialTemplates }: { templates: Template[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTogglePublish = async (template: Template) => {
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !template.is_published }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setTemplates(prev => prev.map(t =>
        t.id === template.id ? { ...t, is_published: !t.is_published } : t
      ));
      toast.success(template.is_published ? 'Template unpublished' : 'Template published');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/templates/${deleteTemplate.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setTemplates(prev => prev.filter(t => t.id !== deleteTemplate.id));
      setDeleteTemplate(null);
      toast.success('Template deleted');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/admin/templates/${template.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-brand-600 transition-colors"
                    >
                      {template.name}
                    </Link>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      template.is_published
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {template.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {template.module_count} module{template.module_count !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {template.estimated_duration_minutes} min
                    </span>
                    <span>Created {formatDateTime(template.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleTogglePublish(template)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={template.is_published ? 'Unpublish' : 'Publish'}
                  >
                    {template.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <Link
                    href={`/admin/templates/${template.id}`}
                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    title="Edit template"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setDeleteTemplate(template)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deleteTemplate}
        onClose={() => setDeleteTemplate(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        description={`Are you sure you want to delete "${deleteTemplate?.name}"? This will permanently remove all modules, steps, and prompt blocks. Active sessions using this template will not be affected.`}
        confirmText="Delete Template"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
