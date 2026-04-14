import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Car, 
  Users, 
  IndianRupee, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  Image as ImageIcon
} from 'lucide-react';
import { VehicleCategory } from '../../../types';

interface VehicleManagerProps {
  categories: VehicleCategory[];
  onAddCategory: () => void;
  onEditCategory: (category: VehicleCategory) => void;
  onDeleteCategory: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const VehicleManager: React.FC<VehicleManagerProps> = ({ 
  categories, 
  onAddCategory, 
  onEditCategory, 
  onDeleteCategory,
  onToggleActive
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <div>
          <h3 className="text-lg font-semibold text-white">Vehicle Categories</h3>
          <p className="text-sm text-zinc-500">Manage ride types, pricing, and capacity</p>
        </div>
        <button 
          onClick={onAddCategory}
          className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 group-hover:border-blue-500/50 transition-colors">
                  {category.icon ? (
                    <img src={category.icon} alt="" className="w-8 h-8 object-contain" />
                  ) : (
                    <Car className="w-8 h-8 text-blue-500" />
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onEditCategory(category)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteCategory(category.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    {category.name}
                    {!category.isActive && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded border border-zinc-700">Inactive</span>
                    )}
                  </h4>
                  <p className="text-xs text-zinc-500">Standard Category</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Base Fare</div>
                    <div className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      <span>{category.baseFare}</span>
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Per KM</div>
                    <div className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      <span>{category.perKmRate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Users className="w-4 h-4" />
                    <span>Up to {category.capacity} persons</span>
                  </div>
                  <button 
                    onClick={() => onToggleActive(category.id, !category.isActive)}
                    className={`flex items-center gap-1 text-xs font-bold uppercase ${
                      category.isActive ? 'text-green-500' : 'text-zinc-500'
                    }`}
                  >
                    {category.isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>Inactive</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VehicleManager;
