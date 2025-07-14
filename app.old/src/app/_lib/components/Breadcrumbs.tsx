import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import React from "react";

export type BreadcrumbItem = {
  title: string;
  url: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="flex flex-row items-start gap-2 mb-2 -mt-2 text-sm text-gray-500">
      {items.map((item, index) => (
        <React.Fragment key={`breadcrumb-${item.title}-${item.url}`}>
          {index != 0 && <div>/</div>}
          <div
            key={item.title}
            className="flex flex-row items-center hover:text-primary hover:underline cursor-pointer"
          >
            {index == 0 && <ChevronLeftIcon className="w-4 h-4" />}
            <a href={item.url}>{item.title}</a>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
