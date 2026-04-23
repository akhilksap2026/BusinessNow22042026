import { createContext, useContext, useState, useLayoutEffect, ReactNode } from "react";

export type Density = "compact" | "comfortable";

interface DensityCtx {
  density: Density;
  setDensity: (d: Density) => void;
}

const DensityContext = createContext<DensityCtx>({
  density: "compact",
  setDensity: () => {},
});

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>(() => {
    const stored = localStorage.getItem("uiDensity");
    return stored === "comfortable" ? "comfortable" : "compact";
  });

  // useLayoutEffect runs synchronously after DOM mutations and before paint,
  // preventing any flash-of-unstyled-content when the user has chosen comfortable.
  useLayoutEffect(() => {
    if (density === "comfortable") {
      document.documentElement.classList.add("density-comfortable");
    } else {
      document.documentElement.classList.remove("density-comfortable");
    }
  }, [density]);

  function setDensity(d: Density) {
    setDensityState(d);
    localStorage.setItem("uiDensity", d);
  }

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  return useContext(DensityContext);
}
