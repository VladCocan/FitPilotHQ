export type BenchmarkFitFixture = {
  id: string;
  label: string;
  fitText: string;
  expectedUnknownItems: number;
  expectedDirectRequirementsAtLeast: number;
  expectedReadinessLabel: string;
};

export const benchmarkFitFixtures: BenchmarkFitFixture[] = [
  {
    id: "simple-frigate",
    label: "Simple Frigate",
    expectedUnknownItems: 0,
    expectedDirectRequirementsAtLeast: 6,
    expectedReadinessLabel: "Ready",
    fitText: `[Rifter, Simple Frigate]
125mm Gatling AutoCannon I
Rocket Launcher I
Small Shield Extender I
Cap Recharger I

Hobgoblin I x1`,
  },
  {
    id: "battlecruiser",
    label: "Battlecruiser",
    expectedUnknownItems: 0,
    expectedDirectRequirementsAtLeast: 5,
    expectedReadinessLabel: "Not Ready",
    fitText: `[Drake, Battlecruiser Benchmark]
Ballistic Control System II
Large Shield Extender II
Heavy Missile Launcher I`,
  },
  {
    id: "drone-fit",
    label: "Drone Fit",
    expectedUnknownItems: 0,
    expectedDirectRequirementsAtLeast: 3,
    expectedReadinessLabel: "Ready",
    fitText: `[Rifter, Drone Benchmark]
Cap Recharger I

Hobgoblin I x3`,
  },
  {
    id: "missile-fit",
    label: "Missile Fit",
    expectedUnknownItems: 0,
    expectedDirectRequirementsAtLeast: 4,
    expectedReadinessLabel: "Ready",
    fitText: `[Rifter, Missile Benchmark]
Rocket Launcher I
Rocket Launcher I
Small Shield Extender I`,
  },
  {
    id: "logistics-fit",
    label: "Logistics Fit",
    expectedUnknownItems: 0,
    expectedDirectRequirementsAtLeast: 4,
    expectedReadinessLabel: "Not Ready",
    fitText: `[Scythe, Logistics Benchmark]
Medium Remote Shield Booster I
Cap Recharger I
Remote Sensor Booster I`,
  },
  {
    id: "weird-mixed-fit",
    label: "Weird Mixed Fit",
    expectedUnknownItems: 0,
    expectedDirectRequirementsAtLeast: 9,
    expectedReadinessLabel: "Ready",
    fitText: `[Rifter, Weird Mixed Benchmark]
125mm Gatling AutoCannon I, Republic Fleet EMP S
Rocket Launcher I, Caldari Navy Nova Rocket
Festival Launcher
Cap Recharger I

Hobgoblin I x2`,
  },
];