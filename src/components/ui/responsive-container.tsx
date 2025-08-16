'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  maxWidth?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full'
};

export function ResponsiveContainer({
  children,
  className = '',
  size = 'lg',
  maxWidth = true
}: ResponsiveContainerProps) {
  const containerClasses = cn(
    'w-full mx-auto px-4 sm:px-6 lg:px-8',
    maxWidth && sizeClasses[size],
    !maxWidth && 'max-w-none',
    className
  );

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
}

// Grid system for responsive layouts
interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
}

export function ResponsiveGrid({
  children,
  className = '',
  cols = { default: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap = 4
}: ResponsiveGridProps) {
  const gridClasses = cn(
    'grid',
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    `gap-${gap}`,
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

// Flex container with responsive breakpoints
interface ResponsiveFlexProps {
  children: ReactNode;
  className?: string;
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  wrap?: boolean;
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
  gap?: number;
  responsive?: {
    sm?: Partial<ResponsiveFlexProps>;
    md?: Partial<ResponsiveFlexProps>;
    lg?: Partial<ResponsiveFlexProps>;
    xl?: Partial<ResponsiveFlexProps>;
  };
}

export function ResponsiveFlex({
  children,
  className = '',
  direction = 'row',
  wrap = false,
  justify = 'start',
  align = 'stretch',
  gap = 0,
  responsive = {}
}: ResponsiveFlexProps) {
  const flexClasses = cn(
    'flex',
    direction !== 'row' && `flex-${direction}`,
    wrap && 'flex-wrap',
    justify !== 'start' && `justify-${justify}`,
    align !== 'stretch' && `items-${align}`,
    gap > 0 && `gap-${gap}`,
    className
  );

  // Generate responsive classes
  const responsiveClasses = Object.entries(responsive).map(([breakpoint, props]) => {
    const classes = [];
    if (props?.direction && props.direction !== direction) {
      classes.push(`${breakpoint}:flex-${props.direction}`);
    }
    if (props?.wrap !== wrap) {
      classes.push(`${breakpoint}:${props.wrap ? 'flex-wrap' : 'flex-nowrap'}`);
    }
    if (props?.justify && props.justify !== justify) {
      classes.push(`${breakpoint}:justify-${props.justify}`);
    }
    if (props?.align && props.align !== align) {
      classes.push(`${breakpoint}:items-${props.align}`);
    }
    if (props?.gap !== undefined && props.gap !== gap) {
      classes.push(`${breakpoint}:gap-${props.gap}`);
    }
    return classes.join(' ');
  }).join(' ');

  return (
    <div className={cn(flexClasses, responsiveClasses)}>
      {children}
    </div>
  );
}

// Responsive spacing component
interface ResponsiveSpacingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

export function ResponsiveSpacing({
  size = 'md',
  direction = 'vertical',
  className = ''
}: ResponsiveSpacingProps) {
  const sizeClasses = {
    xs: direction === 'vertical' ? 'h-2' : 'w-2',
    sm: direction === 'vertical' ? 'h-4' : 'w-4',
    md: direction === 'vertical' ? 'h-8' : 'w-8',
    lg: direction === 'vertical' ? 'h-12' : 'w-12',
    xl: direction === 'vertical' ? 'h-16' : 'w-16',
    '2xl': direction === 'vertical' ? 'h-24' : 'w-24'
  };

  return <div className={cn(sizeClasses[size], className)} />;
}

// Responsive text component
interface ResponsiveTextProps {
  children: ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'label';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  className?: string;
  responsive?: {
    sm?: Partial<ResponsiveTextProps>;
    md?: Partial<ResponsiveTextProps>;
    lg?: Partial<ResponsiveTextProps>;
    xl?: Partial<ResponsiveTextProps>;
  };
}

export function ResponsiveText({
  children,
  variant = 'p',
  size = 'base',
  weight = 'normal',
  color = 'text-gray-900',
  align = 'left',
  className = '',
  responsive = {}
}: ResponsiveTextProps) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl'
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify'
  };

  const textClasses = cn(
    sizeClasses[size],
    weightClasses[weight],
    color,
    alignClasses[align],
    className
  );

  // Generate responsive classes
  const responsiveClasses = Object.entries(responsive).map(([breakpoint, props]) => {
    const classes = [];
    if (props?.size && props.size !== size) {
      classes.push(`${breakpoint}:${sizeClasses[props.size]}`);
    }
    if (props?.weight && props.weight !== weight) {
      classes.push(`${breakpoint}:${weightClasses[props.weight]}`);
    }
    if (props?.color && props.color !== color) {
      classes.push(`${breakpoint}:${props.color}`);
    }
    if (props?.align && props.align !== align) {
      classes.push(`${breakpoint}:${alignClasses[props.align]}`);
    }
    return classes.join(' ');
  }).join(' ');

  const combinedClasses = cn(textClasses, responsiveClasses);

  switch (variant) {
    case 'h1':
      return <h1 className={combinedClasses}>{children}</h1>;
    case 'h2':
      return <h2 className={combinedClasses}>{children}</h2>;
    case 'h3':
      return <h3 className={combinedClasses}>{children}</h3>;
    case 'h4':
      return <h4 className={combinedClasses}>{children}</h4>;
    case 'h5':
      return <h5 className={combinedClasses}>{children}</h5>;
    case 'h6':
      return <h6 className={combinedClasses}>{children}</h6>;
    case 'label':
      return <label className={combinedClasses}>{children}</label>;
    case 'span':
      return <span className={combinedClasses}>{children}</span>;
    default:
      return <p className={combinedClasses}>{children}</p>;
  }
}