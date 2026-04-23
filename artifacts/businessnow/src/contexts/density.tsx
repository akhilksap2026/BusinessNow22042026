import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Density = "compact" | "comfortable";

interface DensityCtx {
  density: Density;
  setDensity: (d: Density) => void;
}

const DensityContext = createContext<DensityCtx>({
  density: "compact",
  setDensity: () => {},
});

function applyDensity(d: Density) {
  if (d === "comfortable") {
    document.documentElement.classList.add("density-comfortable");
  } else {
    document.documentElement.classList.remove("density-comfortable");
  }
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>(() => {
    const stored = localStorage.getItem("uiDensity");
    return stored === "comfortable" ? "comfortable" : "compact";
  });

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  function setDensity(d: Density) {
    setDensityState(d);
    localStorage.setItem("uiDensity", d);
    applyDensity(d);
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
