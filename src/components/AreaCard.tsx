
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Router, 
  Users, 
  TrendingUp, 
  Settings, 
  Eye,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Area {
  id: string;
  name: string;
  description: string;
  routerCount: number;
  customerCount: number;
  status?: 'active' | 'maintenance' | 'inactive';
  coverage?: string;
  revenue?: number;
}

interface AreaCardProps {
  area: Area;
  onEdit?: (area: Area) => void;
  onView?: (area: Area) => void;
  onDelete?: (area: Area) => void;
}

export const AreaCard = ({ area, onEdit, onView, onDelete }: AreaCardProps) => {
  const getStatusColor = (status: string = 'active') => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const formatRevenue = (revenue: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(revenue);
  };

  return (
    <Card className="p-6 bg-white shadow-sm border-slate-200 hover:shadow-md transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {area.name}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">{area.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(area.status)}>
            {area.status === 'active' ? 'Active' : 
             area.status === 'maintenance' ? 'Maintenance' : 'Inactive'}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(area)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(area)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Area
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(area)} className="text-red-600">
                <Settings className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center justify-center mb-1">
            <Router className="h-4 w-4 text-blue-600 mr-1" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{area.routerCount}</p>
          <p className="text-xs text-blue-600 font-medium">Routers</p>
        </div>
        
        <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="flex items-center justify-center mb-1">
            <Users className="h-4 w-4 text-purple-600 mr-1" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{area.customerCount}</p>
          <p className="text-xs text-purple-600 font-medium">Customers</p>
        </div>
      </div>

      {/* Additional Info */}
      {(area.coverage || area.revenue) && (
        <div className="space-y-2 mb-4 p-3 bg-slate-50 rounded-lg">
          {area.coverage && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Coverage</span>
              <span className="font-medium text-gray-900">{area.coverage}</span>
            </div>
          )}
          {area.revenue && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Monthly Revenue</span>
              <span className="font-medium text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {formatRevenue(area.revenue)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 hover:bg-blue-50 hover:border-blue-200"
          onClick={() => onView?.(area)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 hover:bg-slate-50"
          onClick={() => onEdit?.(area)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="hover:bg-blue-50 hover:border-blue-200"
          onClick={() => onView?.(area)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
