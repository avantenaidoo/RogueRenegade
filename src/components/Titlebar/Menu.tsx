import { useState } from "react";
import { menus } from "./menus";
import { MenuItem } from "./MenuItem";

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const closeMenu = () => {
    setOpenMenu(null);
  };

  return (
    <div className="flex h-full">
      {menus.map(menu => (
        <div
          key={menu.label}
          className="relative px-3 h-full flex items-center hover: cursor-pointer"
          onMouseEnter={() => setOpenMenu(menu.label)}
          onMouseLeave={() => setOpenMenu(null)}
        >
          {menu.label}

          {openMenu === menu.label && (
            <div className="absolute top-full left-0 bg-default border-zinc-700 min-w-55 z-50">
              {menu.items.map((item, i) => (
                <MenuItem
                  key={i}
                  item={item}
                  closeMenu={closeMenu}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
