import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, 
  Info, 
  Play, 
  RefreshCw, 
  AlertCircle, 
  ChevronDown, 
  Check, 
  ChevronRight,
  Plus,
  Trash2,
  HelpCircle,
  Shield
} from 'lucide-react';
import agentMeta from '../data/agentMeta.json';
import { ValorantAgent, ValorantMap } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import LanguageSelector from './LanguageSelector';

interface DraftSimulatorProps {
  onBackToHome: () => void;
}

type RankType = 'low' | 'mid' | 'high';

interface CalculationResult {
  probA: number;
  probB: number;
  roleBalanceA: { duelist: boolean; initiator: boolean; sentinel: boolean; controller: boolean };
  roleBalanceB: { duelist: boolean; initiator: boolean; sentinel: boolean; controller: boolean };
  synergiesA: Array<{ agents: string[]; bonus: number }>;
  synergiesB: Array<{ agents: string[]; bonus: number }>;
  countersA: Array<{ counter: string; target: string; bonus: number }>;
  countersB: Array<{ counter: string; target: string; bonus: number }>;
}

export default function DraftSimulator({ onBackToHome }: DraftSimulatorProps) {
  const { t } = useLanguage();
  // Lists
  const [agents, setAgents] = useState<ValorantAgent[]>([]);
  const [maps, setMaps] = useState<ValorantMap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selections
  const [selectedMapUuid, setSelectedMapUuid] = useState<string>('');
  const [selectedRank, setSelectedRank] = useState<RankType>('mid');

  // Custom Dropdown Open States
  const [mapDropdownOpen, setMapDropdownOpen] = useState<boolean>(false);
  const [rankDropdownOpen, setRankDropdownOpen] = useState<boolean>(false);

  // Refs for closing dropdowns when clicking outside
  const mapDropdownRef = useRef<HTMLDivElement>(null);
  const rankDropdownRef = useRef<HTMLDivElement>(null);

  // Draft Slots (5 slots per team)
  const [teamA, setTeamA] = useState<(string | null)[]>([null, null, null, null, null]);
  const [teamB, setTeamB] = useState<(string | null)[]>([null, null, null, null, null]);

  // Modal selection state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [activeSelectSlot, setActiveSelectSlot] = useState<{ team: 'A' | 'B'; index: number } | null>(null);

  // Simulation states
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [simText, setSimText] = useState<string>('INITIATING DATA FLOW...');
  const [hasSimulated, setHasSimulated] = useState<boolean>(false);

  // Animated values
  const [displayPercentA, setDisplayPercentA] = useState<number>(50);
  const [displayPercentB, setDisplayPercentB] = useState<number>(50);
  const [actualPercentA, setActualPercentA] = useState<number>(50);
  const [actualPercentB, setActualPercentB] = useState<number>(50);

  const [recAExplanationOpen, setRecAExplanationOpen] = useState<boolean>(false);
  const [recBExplanationOpen, setRecBExplanationOpen] = useState<boolean>(false);

  // Fetch agents & maps
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        // Maps
        const mapRes = await fetch('https://valorant-api.com/v1/maps');
        const mapJson = await mapRes.json();
        const playableMaps = mapJson.data.filter((m: any) => 
          m.displayIcon !== null &&
          m.displayName.toLowerCase() !== 'the range' &&
          m.displayName.toLowerCase() !== 'pitt'
        );
        setMaps(playableMaps);
        if (playableMaps.length > 0) {
          const ascent = playableMaps.find((m: any) => m.displayName === 'Ascent');
          setSelectedMapUuid(ascent ? ascent.uuid : playableMaps[0].uuid);
        }

        // Agents
        const agentRes = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true');
        const agentJson = await agentRes.json();
        
        // Deduplicate agents
        const uniqueAgents = agentJson.data.reduce((acc: ValorantAgent[], current: any) => {
          const x = acc.find(item => item.displayName === current.displayName);
          if (!x) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, []);

        setAgents(uniqueAgents);
      } catch (err) {
        console.error('Failed to fetch draft simulator data', err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Dropdown Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mapDropdownRef.current && !mapDropdownRef.current.contains(event.target as Node)) {
        setMapDropdownOpen(false);
      }
      if (rankDropdownRef.current && !rankDropdownRef.current.contains(event.target as Node)) {
        setRankDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Maps / Agents Lookup Maps
  const activeMap = useMemo(() => {
    return maps.find(m => m.uuid === selectedMapUuid) || null;
  }, [maps, selectedMapUuid]);

  const agentMapByUuid = useMemo(() => {
    const map: { [uuid: string]: ValorantAgent } = {};
    agents.forEach(a => {
      map[a.uuid] = a;
    });
    return map;
  }, [agents]);

  const agentMapByName = useMemo(() => {
    const map: { [normalizedName: string]: ValorantAgent } = {};
    agents.forEach(a => {
      const normalized = a.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
      map[normalized] = a;
    });
    return map;
  }, [agents]);

  // Dynamically extract official role icons from loaded agents database
  const roleIcons = useMemo(() => {
    const icons: { [role: string]: string } = {};
    agents.forEach(a => {
      const roleName = a.role?.displayName?.toLowerCase();
      if (roleName && !icons[roleName] && a.role?.displayIcon) {
        icons[roleName] = a.role.displayIcon;
      }
    });
    return icons;
  }, [agents]);

  const getNormalizedName = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const getAgentMeta = (displayName: string) => {
    const key = Object.keys(agentMeta.agents).find(
      k => getNormalizedName(k) === getNormalizedName(displayName)
    );
    return key ? (agentMeta.agents as any)[key] : null;
  };

  // Main evaluation logic
  const calculateOdds = (
    teamASelected: (string | null)[],
    teamBSelected: (string | null)[],
    mapName: string,
    rank: RankType
  ): CalculationResult => {
    const listA = teamASelected.map(id => id ? agentMapByUuid[id] : null).filter(Boolean) as ValorantAgent[];
    const listB = teamBSelected.map(id => id ? agentMapByUuid[id] : null).filter(Boolean) as ValorantAgent[];

    // 1. Calculate Base Win rates
    const getBaseWinRate = (agent: ValorantAgent) => {
      const meta = getAgentMeta(agent.displayName);
      let wr = 50.0;
      if (meta && meta.baseWinRates) {
        wr = meta.baseWinRates[mapName] || 50.0;
      }
      
      // Low Rank bonus: ego duelists get +2%
      if (rank === 'low') {
        const isEgoDuelist = ['reyna', 'iso', 'phoenix', 'jett'].includes(agent.displayName.toLowerCase());
        if (isEgoDuelist) {
          wr += 2.0;
        }
      }
      return wr;
    };

    const avgBaseA = listA.length > 0 ? listA.reduce((sum, a) => sum + getBaseWinRate(a), 0) / listA.length : 50.0;
    const avgBaseB = listB.length > 0 ? listB.reduce((sum, b) => sum + getBaseWinRate(b), 0) / listB.length : 50.0;

    // 2. Role checks
    const getRolesCount = (list: ValorantAgent[]) => {
      const counts = { duelist: 0, initiator: 0, sentinel: 0, controller: 0 };
      list.forEach(a => {
        const role = a.role?.displayName?.toLowerCase();
        if (role === 'duelist') counts.duelist++;
        else if (role === 'initiator') counts.initiator++;
        else if (role === 'sentinel') counts.sentinel++;
        else if (role === 'controller') counts.controller++;
      });
      return counts;
    };

    const rolesA = getRolesCount(listA);
    const rolesB = getRolesCount(listB);

    // Role Penalties
    const getRolePenalty = (roles: typeof rolesA) => {
      let penalty = 0;
      const controllerPenalty = 4.0;
      const initiatorPenalty = 3.0;
      const sentinelPenalty = 3.0;
      const duelistPenalty = 2.0;

      const scale = rank === 'low' ? 0.3 : 1.0;

      if (roles.controller === 0) penalty += controllerPenalty * scale;
      if (roles.initiator === 0) penalty += initiatorPenalty * scale;
      if (roles.sentinel === 0) penalty += sentinelPenalty * scale;
      if (roles.duelist === 0) penalty += duelistPenalty;

      return penalty;
    };

    const penaltyA = getRolePenalty(rolesA);
    const penaltyB = getRolePenalty(rolesB);

    // 3. Synergies
    const checkSynergies = (list: ValorantAgent[]) => {
      const active: Array<{ agents: string[]; bonus: number }> = [];
      const agentNames = list.map(a => getNormalizedName(a.displayName));
      
      agentMeta.synergies.forEach(syn => {
        const hasAll = syn.agents.every(name => agentNames.includes(getNormalizedName(name)));
        if (hasAll) {
          const multiplier = rank === 'high' ? 1.5 : 1.0;
          active.push({
            agents: syn.agents,
            bonus: syn.bonus * multiplier
          });
        }
      });
      return active;
    };

    const synergiesA = checkSynergies(listA);
    const synergiesB = checkSynergies(listB);

    const bonusA = synergiesA.reduce((sum, s) => sum + s.bonus, 0);
    const bonusB = synergiesB.reduce((sum, s) => sum + s.bonus, 0);

    // 4. Counters
    const getActiveCounters = (friendlyList: ValorantAgent[], enemyList: ValorantAgent[]) => {
      const active: Array<{ counter: string; target: string; bonus: number }> = [];
      const friendlyNames = friendlyList.map(a => getNormalizedName(a.displayName));
      const enemyNames = enemyList.map(a => getNormalizedName(a.displayName));

      agentMeta.counters.forEach(c => {
        if (friendlyNames.includes(getNormalizedName(c.counter)) && enemyNames.includes(getNormalizedName(c.target))) {
          active.push(c);
        }
      });
      return active;
    };

    const countersByA = getActiveCounters(listA, listB);
    const countersByB = getActiveCounters(listB, listA);

    const counterPenaltyA = countersByB.reduce((sum, c) => sum + c.bonus, 0);
    const counterPenaltyB = countersByA.reduce((sum, c) => sum + c.bonus, 0);

    // Attacker Bias (Team A is Attacker)
    const attackerBiasA = (rolesA.duelist * 2.5) + (rolesA.initiator * 2.0) + (rolesA.sentinel * 1.0) + (rolesA.controller * 2.0);

    // Defender Bias (Team B is Defender)
    const defenderBiasB = (rolesB.duelist * 0.5) + (rolesB.initiator * 1.0) + (rolesB.sentinel * 3.0) + (rolesB.controller * 2.5);

    // Map Side Bias
    let mapSideBiasA = 0;
    let mapSideBiasB = 0;
    if (mapName.toLowerCase() === 'ascent') {
      mapSideBiasB += 1.5;
    } else if (mapName.toLowerCase() === 'lotus') {
      mapSideBiasA += 1.0;
    }

    // Compile raw scores with Side Biases
    let scoreA = avgBaseA - penaltyA + bonusA - counterPenaltyA + attackerBiasA + mapSideBiasA;
    let scoreB = avgBaseB - penaltyB + bonusB - counterPenaltyB + defenderBiasB + mapSideBiasB;

    if (scoreA < 1) scoreA = 1;
    if (scoreB < 1) scoreB = 1;

    const totalScore = scoreA + scoreB;
    const probA = (scoreA / totalScore) * 100;
    const probB = (scoreB / totalScore) * 100;

    return {
      probA,
      probB,
      roleBalanceA: {
        duelist: rolesA.duelist > 0,
        initiator: rolesA.initiator > 0,
        sentinel: rolesA.sentinel > 0,
        controller: rolesA.controller > 0
      },
      roleBalanceB: {
        duelist: rolesB.duelist > 0,
        initiator: rolesB.initiator > 0,
        sentinel: rolesB.sentinel > 0,
        controller: rolesB.controller > 0
      },
      synergiesA,
      synergiesB,
      countersA: countersByA,
      countersB: countersByB
    };
  };

  const calculationResult = useMemo(() => {
    const mapName = activeMap ? activeMap.displayName : 'Ascent';
    return calculateOdds(teamA, teamB, mapName, selectedRank);
  }, [teamA, teamB, activeMap, selectedRank]);

  // Click slot triggers Modal selector
  const handleSlotClick = (team: 'A' | 'B', index: number) => {
    setActiveSelectSlot({ team, index });
    setModalOpen(true);
  };

  // Assign agent selection to current active team slot
  const handleSelectAgent = (agentUuid: string) => {
    if (!activeSelectSlot) return;
    const { team, index } = activeSelectSlot;

    if (team === 'A') {
      const updated = [...teamA];
      updated[index] = agentUuid;
      setTeamA(updated);
    } else {
      const updated = [...teamB];
      updated[index] = agentUuid;
      setTeamB(updated);
    }

    setModalOpen(false);
    setActiveSelectSlot(null);
  };

  // Remove selected agent from team slot
  const handleRemoveAgent = (team: 'A' | 'B', index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (team === 'A') {
      const updated = [...teamA];
      updated[index] = null;
      setTeamA(updated);
    } else {
      const updated = [...teamB];
      updated[index] = null;
      setTeamB(updated);
    }
  };

  // Clear selections
  const handleReset = () => {
    setTeamA([null, null, null, null, null]);
    setTeamB([null, null, null, null, null]);
    setHasSimulated(false);
  };

  // Run Monte Carlo simulation loop
  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimProgress(0);
    setHasSimulated(false);

    const scanTexts = [
      t('SCAN_STEP1'),
      t('SCAN_STEP2'),
      t('SCAN_STEP3'),
      t('SCAN_STEP4')
    ];

    const totalSteps = 20;
    const stepTime = 1500 / totalSteps;

    for (let step = 0; step <= totalSteps; step++) {
      setSimProgress(Math.min((step / totalSteps) * 100, 100));
      const textIndex = Math.floor(step / (totalSteps / scanTexts.length)) % scanTexts.length;
      setSimText(scanTexts[textIndex]);
      await new Promise(r => setTimeout(r, stepTime));
    }

    const ProbA = calculationResult.probA;
    let teamAWins = 0;
    for (let i = 0; i < 10000; i++) {
      if (Math.random() < (ProbA / 100)) {
        teamAWins++;
      }
    }
    const finalPercentA = (teamAWins / 10000) * 100;
    const finalPercentB = 100 - finalPercentA;

    setActualPercentA(finalPercentA);
    setActualPercentB(finalPercentB);
    setIsSimulating(false);
    setHasSimulated(true);

    // Roll percentage counter animation
    let startPercentA = 50;
    const stepsCount = 15;
    for (let i = 0; i <= stepsCount; i++) {
      const progress = i / stepsCount;
      const currentA = startPercentA + (finalPercentA - startPercentA) * progress;
      setDisplayPercentA(currentA);
      setDisplayPercentB(100 - currentA);
      await new Promise(r => setTimeout(r, 30));
    }
  };

  // Recommendation engine calculations
  const recommendations = useMemo(() => {
    const mapName = activeMap ? activeMap.displayName : 'Ascent';

    const getRecForTeam = (team: 'A' | 'B') => {
      const currentTeam = team === 'A' ? teamA : teamB;
      const oppositeTeam = team === 'A' ? teamB : teamA;
      const currentProb = team === 'A' ? calculationResult.probA : calculationResult.probB;
      
      const validAgents = currentTeam.filter(Boolean) as string[];

      // If team is empty, recommendController/smoke
      if (validAgents.length === 0) {
        return {
          type: 'pick',
          text: 'Masukan Smoke / Controller untuk mengisi basis strategi.'
        };
      }

      const currentAgentUuids = new Set(validAgents);
      const candidates = agents.filter(a => !currentAgentUuids.has(a.uuid));

      let bestImprovement = 0;
      let replaceAgent: ValorantAgent | null = null;
      let targetAgent: ValorantAgent | null = null;

      const emptySlotIndex = currentTeam.findIndex(id => id === null);

      if (emptySlotIndex !== -1) {
        // Try filling the empty slot
        candidates.forEach(cand => {
          const testTeam = [...currentTeam];
          testTeam[emptySlotIndex] = cand.uuid;

          const res = calculateOdds(
            team === 'A' ? testTeam : oppositeTeam,
            team === 'B' ? testTeam : oppositeTeam,
            mapName,
            selectedRank
          );

          const newProb = team === 'A' ? res.probA : res.probB;
          const diff = newProb - currentProb;

          if (diff > bestImprovement) {
            bestImprovement = diff;
            targetAgent = cand;
            replaceAgent = null;
          }
        });
      } else {
        // Try replacing lowest performing agent
        currentTeam.forEach((currentUuid, idx) => {
          if (!currentUuid) return;
          const originalAgent = agentMapByUuid[currentUuid];
          if (!originalAgent) return;

          candidates.forEach(cand => {
            const testTeam = [...currentTeam];
            testTeam[idx] = cand.uuid;

            const res = calculateOdds(
              team === 'A' ? testTeam : oppositeTeam,
              team === 'B' ? testTeam : oppositeTeam,
              mapName,
              selectedRank
            );

            const newProb = team === 'A' ? res.probA : res.probB;
            const diff = newProb - currentProb;

            if (diff > bestImprovement) {
              bestImprovement = diff;
              replaceAgent = originalAgent;
              targetAgent = cand;
            }
          });
        });
      }

      if (targetAgent && bestImprovement > 0) {
        return {
          type: replaceAgent ? 'replace' : 'add',
          replaceAgent,
          targetAgent,
          improvement: bestImprovement
        };
      }

      return null;
    };

    return {
      recA: getRecForTeam('A'),
      recB: getRecForTeam('B')
    };
  }, [teamA, teamB, agents, activeMap, selectedRank, calculationResult]);

  // Component 1: Match Analysis Projection (Macro)
  const draftVerdict = useMemo(() => {
    const mapName = activeMap ? activeMap.displayName : 'Ascent';
    const rankLabel = selectedRank === 'low' ? t('RANK_LOW') : selectedRank === 'mid' ? t('RANK_MID') : t('RANK_HIGH');
    
    // Get valid agents
    const listA = teamA.map(id => id ? agentMapByUuid[id] : null).filter(Boolean) as ValorantAgent[];
    const listB = teamB.map(id => id ? agentMapByUuid[id] : null).filter(Boolean) as ValorantAgent[];

    // Count Roles
    const getRolesCount = (list: ValorantAgent[]) => {
      const counts = { duelist: 0, initiator: 0, sentinel: 0, controller: 0 };
      list.forEach(a => {
        const role = a.role?.displayName?.toLowerCase();
        if (role === 'duelist') counts.duelist++;
        else if (role === 'initiator') counts.initiator++;
        else if (role === 'sentinel') counts.sentinel++;
        else if (role === 'controller') counts.controller++;
      });
      return counts;
    };

    const rolesA = getRolesCount(listA);
    const rolesB = getRolesCount(listB);

    // Case 1: Post-Plant vs Retake (Attacker A has no Sentinel, Defender B has Sentinel)
    const hasSentinelB = rolesB.sentinel > 0;
    const sentinelsInB = listB
      .filter(a => a.role?.displayName?.toLowerCase() === 'sentinel')
      .map(a => a.displayName);
    const sentinelNamesB = sentinelsInB.length > 0 ? sentinelsInB.join(', ') : 'Sentinel';

    if (rolesA.sentinel === 0 && hasSentinelB) {
      return {
        case: 1,
        titleA: t('VERDICT_TITLE_WEAKNESS', { team: 'TEAM A' }),
        titleB: t('VERDICT_TITLE_STRENGTH', { team: 'TEAM B' }),
        textA: t('VERDICT_CASE1_ATTACKER'),
        textB: t('VERDICT_CASE1_DEFENDER', { agents: sentinelNamesB }),
        isStrengthA: false,
        isStrengthB: true
      };
    }

    // Case 2: Aggressive Defense (Defender B has >= 2 Duelists, Attacker A has balanced draft with Initiator)
    const hasInitiatorA = rolesA.initiator > 0;
    if (rolesB.duelist >= 2 && rolesA.duelist <= 1 && hasInitiatorA) {
      return {
        case: 2,
        titleA: t('VERDICT_TITLE_STRENGTH', { team: 'TEAM A' }),
        titleB: t('VERDICT_TITLE_WEAKNESS', { team: 'TEAM B' }),
        textA: t('VERDICT_CASE2_ATTACKER'),
        textB: t('VERDICT_CASE2_DEFENDER', { map: mapName }),
        isStrengthA: true,
        isStrengthB: false
      };
    }

    // Case 3: Raw Map Winrate Gap (Fallback)
    const probA = calculationResult.probA;
    const probB = calculationResult.probB;

    if (probA >= probB) {
      return {
        case: 3,
        titleA: t('VERDICT_TITLE_STRENGTH', { team: 'TEAM A' }),
        titleB: t('VERDICT_TITLE_WEAKNESS', { team: 'TEAM B' }),
        textA: t('VERDICT_CASE3_FAVORED', { favored: 'A', lagging: 'B', map: mapName, rank: rankLabel }),
        textB: t('VERDICT_CASE3_LAGGING', { favored: 'A', lagging: 'B', map: mapName, rank: rankLabel }),
        isStrengthA: true,
        isStrengthB: false
      };
    } else {
      return {
        case: 3,
        titleA: t('VERDICT_TITLE_WEAKNESS', { team: 'TEAM A' }),
        titleB: t('VERDICT_TITLE_STRENGTH', { team: 'TEAM B' }),
        textA: t('VERDICT_CASE3_LAGGING', { favored: 'B', lagging: 'A', map: mapName, rank: rankLabel }),
        textB: t('VERDICT_CASE3_FAVORED', { favored: 'B', lagging: 'A', map: mapName, rank: rankLabel }),
        isStrengthA: false,
        isStrengthB: true
      };
    }
  }, [teamA, teamB, activeMap, selectedRank, calculationResult, agentMapByUuid, t]);

  const getRecommendationExplanation = (team: 'A' | 'B', rec: any) => {
    if (!rec) return '';
    const mapName = activeMap ? activeMap.displayName : 'Ascent';
    const rankLabel = selectedRank === 'low' ? t('RANK_LOW') : selectedRank === 'mid' ? t('RANK_MID') : t('RANK_HIGH');
    const winrateDiff = rec.improvement ? rec.improvement.toFixed(1) : '0.0';

    const oldAgentName = rec.replaceAgent ? rec.replaceAgent.displayName : t('EMPTY');
    const newAgentName = rec.targetAgent ? rec.targetAgent.displayName : '';
    const newAgentRole = rec.targetAgent?.role?.displayName || '';

    // Trigger 1: Filling Empty Role (Role Gap) - Controller / Sentinel
    const currentTeam = team === 'A' ? teamA : teamB;
    const list = currentTeam.map(id => id ? agentMapByUuid[id] : null).filter(Boolean) as ValorantAgent[];
    const counts = { sentinel: 0, controller: 0 };
    list.forEach(a => {
      const r = a.role?.displayName?.toLowerCase();
      if (r === 'sentinel') counts.sentinel++;
      else if (r === 'controller') counts.controller++;
    });

    const isNewAgentSentinelOrController = ['sentinel', 'controller'].includes(newAgentRole.toLowerCase());
    const isSentinelEmpty = counts.sentinel === 0;
    const isControllerEmpty = counts.controller === 0;

    if (isNewAgentSentinelOrController && ((newAgentRole.toLowerCase() === 'sentinel' && isSentinelEmpty) || (newAgentRole.toLowerCase() === 'controller' && isControllerEmpty))) {
      return t('MICRO_REC_ROLE_GAP', { role: newAgentRole, oldAgent: oldAgentName, newAgent: newAgentName, map: mapName, winrate: winrateDiff });
    }

    // Trigger 2: Correcting Double Duelist on Defense (Team B - Defenders)
    const duelistCount = list.filter(a => a.role?.displayName?.toLowerCase() === 'duelist').length;
    if (team === 'B' && duelistCount >= 2 && newAgentRole.toLowerCase() === 'sentinel') {
      return t('MICRO_REC_DOUBLE_DUELIST', { oldAgent: oldAgentName, newAgent: newAgentName, map: mapName });
    }

    // Trigger 3: Map-Specific Performance (Fallback)
    if (rec.replaceAgent) {
      return t('MICRO_REC_MAP_SPECIFIC', { oldAgent: oldAgentName, newAgent: newAgentName, map: mapName, rank: rankLabel, winrate: winrateDiff });
    } else {
      return t('MICRO_REC_EMPTY_SLOT', { newAgent: newAgentName, map: mapName, rank: rankLabel, winrate: winrateDiff });
    }
  };

  // Swap sides: swaps Team A and Team B agent drafts
  const handleSwapSides = () => {
    const tempA = [...teamA];
    const tempB = [...teamB];
    setTeamA(tempB);
    setTeamB(tempA);
    
    // Swap recommendation states as well
    const tempOpen = recAExplanationOpen;
    setRecAExplanationOpen(recBExplanationOpen);
    setRecBExplanationOpen(tempOpen);
  };

  // Attacker vs Defender detailed text generator
  const generateDetailedSideAnalysis = (
    teamName: string,
    teamUuids: (string | null)[],
    side: 'attacker' | 'defender',
    mapName: string
  ): string => {
    const list = teamUuids.map(id => id ? agentMapByUuid[id] : null).filter(Boolean) as ValorantAgent[];
    if (list.length === 0) {
      return t('SIDE_ANALYSIS_EMPTY', { team: teamName });
    }

    const counts = { duelist: 0, initiator: 0, sentinel: 0, controller: 0 };
    const duelistInitiatorNames: string[] = [];
    const sentinelNames: string[] = [];

    list.forEach(a => {
      const r = a.role?.displayName?.toLowerCase();
      if (r === 'duelist') {
        counts.duelist++;
        duelistInitiatorNames.push(a.displayName);
      } else if (r === 'initiator') {
        counts.initiator++;
        duelistInitiatorNames.push(a.displayName);
      } else if (r === 'sentinel') {
        counts.sentinel++;
        sentinelNames.push(a.displayName);
      } else if (r === 'controller') {
        counts.controller++;
      }
    });

    if (side === 'attacker') {
      if (counts.duelist + counts.initiator >= 3) {
        const namesStr = duelistInitiatorNames.join(', ');
        return t('SIDE_ANALYSIS_ATTACK_STRONG', { agents: namesStr, map: mapName });
      } else if (counts.initiator === 0) {
        return t('SIDE_ANALYSIS_ATTACK_WEAK');
      } else {
        return t('SIDE_ANALYSIS_ATTACK_BALANCED', { map: mapName });
      }
    } else {
      if (counts.sentinel > 0) {
        const namesStr = sentinelNames.join(', ');
        return t('SIDE_ANALYSIS_DEFEND_STRONG', { agents: namesStr });
      } else {
        return t('SIDE_ANALYSIS_DEFEND_WEAK', { map: mapName });
      }
    }
  };

  return (
    <div 
      className="min-h-screen text-white scanlines font-sans pb-24 relative overflow-x-hidden"
      style={{
        backgroundImage: activeMap ? `url(${activeMap.splash})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        transition: 'background-image 0.5s ease-in-out'
      }}
    >
      {/* Dark blur backdrop overlay */}
      <div className="absolute inset-0 bg-[#0A0E11]/85 backdrop-blur-md -z-10" />
      
      {/* NAVBAR */}
      <header className="border-b border-white/5 bg-[#0F1215]/95 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBackToHome}
            className="p-1.5 bg-[#161A1E] hover:bg-white/5 border border-white/10 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-rajdhani font-black tracking-widest text-lg text-white leading-none">
              {t('DRAFT_SIMULATOR').toUpperCase()}
            </h1>
            <p className="text-[9px] font-mono text-[#00F0FF] tracking-widest uppercase hidden sm:block">
              {t('MATCH_ANALYST_FORECAST')}
            </p>
          </div>
        </div>
        <div>
          <LanguageSelector />
        </div>
      </header>

      {/* MAP DETAIL OVERVIEW BAR */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="border border-white/5 bg-[#12161A]/80 backdrop-blur-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono text-[#FF4655] tracking-widest uppercase font-bold">{t('ACTIVE_COMBAT_ZONE')}</span>
            <h2 className="font-rajdhani font-black text-2xl tracking-wider text-white">
              {activeMap ? activeMap.displayName.toUpperCase() : t('SELECT_MAP').toUpperCase()}
            </h2>
            {activeMap && (
              <span className="text-[9px] font-mono text-gray-500 tracking-wider">
                COORDINATES: {activeMap.coordinates.toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-[10px] font-mono text-gray-400">
            <Info size={14} className="text-[#00F0FF]" />
            <span>{t('CHOOSE_5_AGENTS')}</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* INTERACTIVE TEAM SLOTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* TEAM A GRID (5 horizontal slots) */}
          <div className="lg:col-span-5 bg-[#0F1215]/90 backdrop-blur-md border-2 border-[#FF4655]/40 rounded-none p-5 relative overflow-hidden shadow-[0_0_25px_rgba(255,70,85,0.08)]">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FF4655]" />
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-5">
              <h3 className="font-rajdhani font-black text-base text-white tracking-widest flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4655] animate-pulse" />
                <span>{t('TEAM_A_ATTACKING').toUpperCase()}</span>
              </h3>
              <span className="text-[9px] font-mono text-[#FF4655] font-bold">RED FORCE</span>
            </div>

            {/* Slots containers */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-4 w-full">
              {teamA.map((agentUuid, idx) => {
                const agent = agentUuid ? agentMapByUuid[agentUuid] : null;
                return (
                  <div key={`teamA-${idx}`} className="flex flex-col items-center min-w-0">
                    <div
                      onClick={() => handleSlotClick('A', idx)}
                      className={`w-full aspect-square max-w-[80px] border-2 transition duration-200 cursor-pointer relative group overflow-hidden ${
                        agent 
                          ? 'border-[#FF4655] bg-[#1a1215] shadow-[0_0_20px_rgba(255,70,85,0.35)]' 
                          : 'border-dashed border-white/20 bg-black/40 hover:border-white/40 hover:bg-white/10'
                      }`}
                    >
                      {agent ? (
                        <>
                          <img 
                            src={agent.displayIcon} 
                            alt={agent.displayName} 
                            className="w-full h-full object-cover scale-105"
                          />
                          
                          {/* Role Icon inside left corner */}
                          {agent.role?.displayIcon && (
                            <div className="absolute bottom-1 left-1 bg-black/60 border border-white/10 p-0.5 w-5 h-5 flex items-center justify-center rounded-xs">
                              <img 
                                src={agent.role.displayIcon} 
                                alt={agent.role.displayName} 
                                className="w-3.5 h-3.5 object-contain invert opacity-80" 
                              />
                            </div>
                          )}

                          {/* Hover action to remove */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <button
                              onClick={(e) => handleRemoveAgent('A', idx, e)}
                              className="p-1.5 bg-[#FF4655] text-white hover:bg-[#FF4655]/90 transition"
                              title="Hapus"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 group-hover:text-gray-400">
                          <Plus size={16} className="opacity-40 group-hover:opacity-100 transition" />
                        </div>
                      )}
                    </div>
                    {/* Name & Role Text Under the Box */}
                    <span className="font-rajdhani font-black text-[9px] sm:text-xs tracking-wider uppercase truncate text-center w-full mt-2 text-gray-200 block">
                      {agent ? agent.displayName : t('EMPTY')}
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-mono text-gray-500 uppercase tracking-widest text-center truncate w-full leading-tight block">
                      {agent ? agent.role?.displayName : '-'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Visual Recommendation Box */}
            {recommendations.recA && (
              <div className="mt-5 pt-4 border-t border-white/5">
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-2">{t('REC_ENGINE_BANNER')}</span>
                {recommendations.recA.type === 'pick' ? (
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-gray-400 bg-white/5 border border-white/5 p-2">
                    <Info size={12} className="text-[#00F0FF]" />
                    <span>{t('REC_INPUT_SMOKE')}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-black/20 border border-[#00F0FF]/10 p-2.5">
                      <div className="flex items-center space-x-2">
                        {recommendations.recA.replaceAgent ? (
                          <>
                            <img 
                              src={recommendations.recA.replaceAgent.displayIcon} 
                              alt="Replace" 
                              className="w-8 h-8 object-cover border border-white/10"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">➔</span>
                          </>
                        ) : (
                          <div className="w-8 h-8 border border-dashed border-white/10 flex items-center justify-center bg-black/40 text-gray-600">
                            <Plus size={10} />
                          </div>
                        )}
                        
                        <img 
                          src={recommendations.recA.targetAgent.displayIcon} 
                          alt="Target" 
                          className="w-8 h-8 object-cover border border-[#00F0FF]/30"
                        />
                        <div className="leading-tight">
                          <span className="text-[8px] font-mono text-gray-400 block uppercase">
                            {recommendations.recA.replaceAgent ? `${t('REC_GANTI')} ${recommendations.recA.replaceAgent.displayName.toUpperCase()}` : t('REC_RECOMMENDED_INPUT')}
                          </span>
                          <span className="font-rajdhani font-black text-xs text-white tracking-wider">
                            {t('REC_DRAFT')} {recommendations.recA.targetAgent.displayName.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#00FF00] bg-[#00FF00]/5 border border-[#00FF00]/10 px-2 py-0.5">
                        +{recommendations.recA.improvement.toFixed(1)}%
                      </span>
                    </div>

                    {/* Accordion Trigger Panel */}
                    <div className="border border-white/5 bg-black/25">
                      <button
                        onClick={() => setRecAExplanationOpen(!recAExplanationOpen)}
                        className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-gray-400 hover:text-white uppercase transition duration-150 cursor-pointer"
                      >
                        <span>LIHAT EVALUASI TAKTIS</span>
                        <ChevronDown 
                          size={12} 
                          className={`transition-transform duration-300 ${recAExplanationOpen ? 'rotate-180 text-[#00F0FF]' : 'text-gray-500'}`} 
                        />
                      </button>

                      {/* Accordion Panel Content */}
                      <div 
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                          recAExplanationOpen ? 'max-h-40 border-t border-white/5 p-3' : 'max-h-0'
                        }`}
                      >
                        <p className="text-xs text-[#ECE8E1]/80 leading-relaxed font-sans font-medium">
                          {getRecommendationExplanation('A', recommendations.recA)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SIMULATION PANEL - MIDDLE COLUMN */}
          <div className="lg:col-span-2 flex flex-col items-center justify-start p-3 bg-[#12161A]/80 backdrop-blur-sm border border-white/5 rounded-none space-y-4 text-center min-h-[360px] relative z-30">
            
            {/* CUSTOM PREMIUM MAP DROPDOWN */}
            <div className="flex flex-col relative w-full" ref={mapDropdownRef}>
              <span className="text-[9px] font-mono text-gray-500 uppercase mb-1 text-left">{t('SELECT_MAP')}</span>
              <button
                onClick={() => setMapDropdownOpen(!mapDropdownOpen)}
                className="bg-[#161A1E] border border-white/10 hover:border-[#00F0FF] text-xs font-mono font-bold tracking-widest px-3 py-2 focus:border-[#00F0FF] outline-none text-white cursor-pointer uppercase flex items-center justify-between w-full transition duration-150"
              >
                <div className="flex items-center space-x-2 truncate">
                  {activeMap?.listViewIcon && (
                    <img src={activeMap.listViewIcon} alt="Icon" className="w-5 h-5 object-cover rounded-xs shrink-0" />
                  )}
                  <span className="truncate">{activeMap ? activeMap.displayName : t('SELECT_MAP').toUpperCase()}</span>
                </div>
                <ChevronDown size={14} className="text-gray-500 ml-1 shrink-0" />
              </button>

              {mapDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-full max-h-60 overflow-y-auto bg-[#0F1215] border border-white/10 shadow-2xl z-50 p-1 space-y-0.5">
                  {maps.map(m => (
                    <button
                      key={m.uuid}
                      onClick={() => {
                        setSelectedMapUuid(m.uuid);
                        setMapDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-[9px] font-mono font-bold transition flex items-center justify-between border cursor-pointer ${
                        m.uuid === selectedMapUuid 
                          ? 'border-[#00F0FF] bg-[#00F0FF]/5 text-white' 
                          : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {m.listViewIcon ? (
                          <img src={m.listViewIcon} alt={m.displayName} className="w-6 h-6 object-cover border border-white/5 rounded-xs shrink-0" />
                        ) : (
                          <div className="w-6 h-6 bg-white/5 border border-white/5 rounded-xs shrink-0" />
                        )}
                        <span className="uppercase tracking-wider truncate">{m.displayName}</span>
                      </div>
                      {m.uuid === selectedMapUuid && <Check size={10} className="text-[#00F0FF]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CUSTOM PREMIUM RANK DROPDOWN */}
            <div className="flex flex-col relative w-full" ref={rankDropdownRef}>
              <span className="text-[9px] font-mono text-gray-500 uppercase mb-1 text-left">{t('SKILL_BRACKET')}</span>
              <button
                onClick={() => setRankDropdownOpen(!rankDropdownOpen)}
                className="bg-[#161A1E] border border-white/10 hover:border-[#00F0FF] text-xs font-mono font-bold tracking-widest px-3 py-2 focus:border-[#00F0FF] outline-none text-white cursor-pointer uppercase flex items-center justify-between w-full transition duration-150"
              >
                <span className="truncate">
                  {selectedRank === 'low' && t('RANK_LOW')}
                  {selectedRank === 'mid' && t('RANK_MID')}
                  {selectedRank === 'high' && t('RANK_HIGH')}
                </span>
                <ChevronDown size={14} className="text-gray-500 ml-1 shrink-0" />
              </button>

              {rankDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-full bg-[#0F1215] border border-white/10 shadow-2xl z-50 p-1 space-y-0.5">
                  {([
                    { id: 'low', label: `${t('RANK_LOW')} (LOW)` },
                    { id: 'mid', label: `${t('RANK_MID')} (MID)` },
                    { id: 'high', label: `${t('RANK_HIGH')} (HIGH)` }
                  ] as const).map(rk => (
                    <button
                      key={rk.id}
                      onClick={() => {
                        setSelectedRank(rk.id);
                        setRankDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[9px] font-mono font-bold transition flex items-center justify-between border cursor-pointer uppercase ${
                        rk.id === selectedRank 
                          ? 'border-[#00F0FF] bg-[#00F0FF]/5 text-white' 
                          : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{rk.label}</span>
                      {rk.id === selectedRank && <Check size={10} className="text-[#00F0FF]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SWAP SIDES BUTTON */}
            <button
              onClick={handleSwapSides}
              className="w-full py-2 bg-[#161A1E] border border-[#00F0FF]/30 hover:border-[#00F0FF] hover:bg-[#00F0FF]/5 text-xs text-[#00F0FF] font-rajdhani font-black tracking-widest uppercase cursor-pointer transition flex items-center justify-center space-x-1.5"
            >
              <span>{t('SWAP_SIDES').toUpperCase()} ⇆</span>
            </button>

            <div className="w-full border-t border-white/5 my-0.5" />

            {/* VS branding */}
            <div className="relative font-bold">
              <div className="w-12 h-12 bg-[#161A1E] border border-white/10 rounded-full flex items-center justify-center shadow-lg relative z-10">
                <span className="font-rajdhani font-black text-xl tracking-widest text-[#FF4655]">V</span>
                <span className="font-rajdhani font-black text-xl tracking-widest text-[#00F0FF] -ml-0.5">S</span>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/2 rounded-full blur-md -z-0" />
            </div>

            <div className="space-y-2 w-full pt-1">
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="w-full py-3 bg-[#FF4655] hover:bg-[#FF5865] disabled:bg-[#161A1E] disabled:border-white/10 disabled:text-gray-500 border border-transparent text-xs font-rajdhani font-black tracking-widest text-black disabled:text-gray-600 uppercase cursor-pointer disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
              >
                <Play size={12} className="fill-current shrink-0" />
                <span>{isSimulating ? t('SIMULATING').toUpperCase() : t('SIMULATE').toUpperCase()}</span>
              </button>

              <button
                onClick={handleReset}
                className="w-full py-1.5 border border-white/10 hover:border-white/20 bg-transparent text-gray-400 hover:text-white font-mono text-[9px] tracking-widest uppercase cursor-pointer transition flex items-center justify-center space-x-1"
              >
                <RefreshCw size={8} />
                <span>{t('RESET_ALL').toUpperCase()}</span>
              </button>
            </div>
          </div>

          {/* TEAM B GRID (5 horizontal slots) */}
          <div className="lg:col-span-5 bg-[#0F1215]/90 backdrop-blur-md border-2 border-[#00F0FF]/40 rounded-none p-5 relative overflow-hidden shadow-[0_0_25px_rgba(0,240,255,0.08)]">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-[#00F0FF]" />
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-5">
              <h3 className="font-rajdhani font-black text-base text-white tracking-widest flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
                <span>{t('TEAM_B_DEFENDING').toUpperCase()}</span>
              </h3>
              <span className="text-[9px] font-mono text-[#00F0FF] font-bold">BLUE SHIELD</span>
            </div>

            {/* Slots containers */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-4 w-full">
              {teamB.map((agentUuid, idx) => {
                const agent = agentUuid ? agentMapByUuid[agentUuid] : null;
                return (
                  <div key={`teamB-${idx}`} className="flex flex-col items-center min-w-0">
                    <div
                      onClick={() => handleSlotClick('B', idx)}
                      className={`w-full aspect-square max-w-[80px] border-2 transition duration-200 cursor-pointer relative group overflow-hidden ${
                        agent 
                          ? 'border-[#00F0FF] bg-[#12181a] shadow-[0_0_20px_rgba(0,240,255,0.35)]' 
                          : 'border-dashed border-white/20 bg-black/40 hover:border-white/40 hover:bg-white/10'
                      }`}
                    >
                      {agent ? (
                        <>
                          <img 
                            src={agent.displayIcon} 
                            alt={agent.displayName} 
                            className="w-full h-full object-cover scale-105"
                          />
                          
                          {/* Role Icon inside left corner */}
                          {agent.role?.displayIcon && (
                            <div className="absolute bottom-1 left-1 bg-black/60 border border-white/10 p-0.5 w-5 h-5 flex items-center justify-center rounded-xs">
                              <img 
                                src={agent.role.displayIcon} 
                                alt={agent.role.displayName} 
                                className="w-3.5 h-3.5 object-contain invert opacity-80" 
                              />
                            </div>
                          )}

                          {/* Hover action to remove */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <button
                              onClick={(e) => handleRemoveAgent('B', idx, e)}
                              className="p-1.5 bg-[#FF4655] text-white hover:bg-[#FF4655]/90 transition"
                              title="Hapus"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 group-hover:text-gray-400">
                          <Plus size={16} className="opacity-40 group-hover:opacity-100 transition" />
                        </div>
                      )}
                    </div>
                    {/* Name & Role Text Under the Box */}
                    <span className="font-rajdhani font-black text-[9px] sm:text-xs tracking-wider uppercase truncate text-center w-full mt-2 text-gray-200 block">
                      {agent ? agent.displayName : t('EMPTY')}
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-mono text-gray-500 uppercase tracking-widest text-center truncate w-full leading-tight block">
                      {agent ? agent.role?.displayName : '-'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Visual Recommendation Box */}
            {recommendations.recB && (
              <div className="mt-5 pt-4 border-t border-white/5">
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-2">{t('REC_ENGINE_BANNER')}</span>
                {recommendations.recB.type === 'pick' ? (
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-gray-400 bg-white/5 border border-white/5 p-2">
                    <Info size={12} className="text-[#00F0FF]" />
                    <span>{t('REC_INPUT_SMOKE')}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-black/20 border border-[#00F0FF]/10 p-2.5">
                      <div className="flex items-center space-x-2">
                        {recommendations.recB.replaceAgent ? (
                          <>
                            <img 
                              src={recommendations.recB.replaceAgent.displayIcon} 
                              alt="Replace" 
                              className="w-8 h-8 object-cover border border-white/10"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">➔</span>
                          </>
                        ) : (
                          <div className="w-8 h-8 border border-dashed border-white/10 flex items-center justify-center bg-black/40 text-gray-600">
                            <Plus size={10} />
                          </div>
                        )}
                        
                        <img 
                          src={recommendations.recB.targetAgent.displayIcon} 
                          alt="Target" 
                          className="w-8 h-8 object-cover border border-[#00F0FF]/30"
                        />
                        <div className="leading-tight">
                          <span className="text-[8px] font-mono text-gray-400 block uppercase">
                            {recommendations.recB.replaceAgent ? `${t('REC_GANTI')} ${recommendations.recB.replaceAgent.displayName.toUpperCase()}` : t('REC_RECOMMENDED_INPUT')}
                          </span>
                          <span className="font-rajdhani font-black text-xs text-white tracking-wider">
                            {t('REC_DRAFT')} {recommendations.recB.targetAgent.displayName.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#00FF00] bg-[#00FF00]/5 border border-[#00FF00]/10 px-2 py-0.5">
                        +{recommendations.recB.improvement.toFixed(1)}%
                      </span>
                    </div>

                    {/* Accordion Trigger Panel */}
                    <div className="border border-white/5 bg-black/25">
                      <button
                        onClick={() => setRecBExplanationOpen(!recBExplanationOpen)}
                        className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-gray-400 hover:text-white uppercase transition duration-150 cursor-pointer"
                      >
                        <span>LIHAT EVALUASI TAKTIS</span>
                        <ChevronDown 
                          size={12} 
                          className={`transition-transform duration-300 ${recBExplanationOpen ? 'rotate-180 text-[#00F0FF]' : 'text-gray-500'}`} 
                        />
                      </button>

                      {/* Accordion Panel Content */}
                      <div 
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                          recBExplanationOpen ? 'max-h-40 border-t border-white/5 p-3' : 'max-h-0'
                        }`}
                      >
                        <p className="text-xs text-[#ECE8E1]/80 leading-relaxed font-sans font-medium">
                          {getRecommendationExplanation('B', recommendations.recB)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* SCANNING STATE PROGRESS BAR */}
        {isSimulating && (
          <div className="mt-8 bg-[#0F1215] border border-white/5 p-6 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
              <span className="tracking-widest uppercase">{simText}</span>
              <span>{Math.round(simProgress)}%</span>
            </div>
            <div className="w-full bg-[#161A1E] h-2.5 overflow-hidden border border-white/10">
              <div 
                className="bg-gradient-to-r from-[#FF4655] to-[#00F0FF] h-full transition-all duration-75"
                style={{ width: `${simProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* RESULTS PANEL */}
        {hasSimulated && !isSimulating && (
          <div className="mt-8 space-y-6">
            
            {/* Primary outcome probability container */}
            <div className="bg-[#12161A] border border-white/10 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF4655]/5 to-[#00F0FF]/5" />
              
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest block mb-4">
                PROJECTED SIMULATION PROBABILITY (10,000 RUNS)
              </span>

              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 relative z-10">
                <div className="text-center">
                  <span className="font-mono text-xs text-gray-500 uppercase tracking-widest block mb-1">TEAM A PROBABILITY</span>
                  <span className="font-rajdhani font-black text-6xl tracking-wider text-[#FF4655]">
                    {displayPercentA.toFixed(1)}%
                  </span>
                </div>

                <div className="h-0.5 w-12 bg-white/10 md:h-12 md:w-0.5" />

                <div className="text-center">
                  <span className="font-mono text-xs text-gray-500 uppercase tracking-widest block mb-1">TEAM B PROBABILITY</span>
                  <span className="font-rajdhani font-black text-6xl tracking-wider text-[#00F0FF]">
                    {displayPercentB.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress bar comparison */}
              <div className="mt-8 w-full h-4 flex border border-white/10 overflow-hidden bg-[#161A1E]">
                <div className="bg-[#FF4655] transition-all duration-300" style={{ width: `${actualPercentA}%` }} />
                <div className="bg-[#00F0FF] transition-all duration-300 flex-1" />
              </div>
            </div>

            {/* Component 1: Match Analysis Projection */}
            <div className="bg-[#0F1215]/95 backdrop-blur-md border-2 border-white/10 p-6 shadow-[0_0_20px_rgba(255,255,255,0.03)] space-y-6">
              
              {/* Macro Verdict */}
              <div className="border-b border-white/5 pb-2.5">
                <span className="text-[10px] font-mono text-[#00F0FF] tracking-widest uppercase font-bold">{t('MATCH_ANALYSIS_PROJECTION')}</span>
                <h3 className="font-rajdhani font-black text-lg tracking-wider text-white mt-0.5">{t('PROYEKSI_ANALISIS').toUpperCase()}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/5 pb-2">
                {/* Column Left (Team A Analysis) */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {draftVerdict.isStrengthA ? (
                      <div className="p-1 bg-[#00FF00]/10 border border-[#00FF00]/20 rounded-xs text-[#00FF00]">
                        <Shield size={14} className="fill-current" />
                      </div>
                    ) : (
                      <div className="p-1 bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-xs text-[#FF4655]">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M21 3a1 1 0 0 0-1.41 0l-7.09 7.09-1.42-1.42L18.17 1.6a1 1 0 0 0-1.41-1.41l-7.09 7.09-2.12-2.12a1 1 0 0 0-1.41 0l-4.24 4.24a1 1 0 0 0 0 1.41l2.12 2.12-2.83 2.83a2 2 0 0 0 0 2.83l2.83 2.83a2 2 0 0 0 2.83 0l2.83-2.83 2.12 2.12a1 1 0 0 0 1.41 0l4.24-4.24a1 1 0 0 0 0-1.41l-2.12-2.12 7.09-7.09A1 1 0 0 0 21 3z"/>
                        </svg>
                      </div>
                    )}
                    <span className={`font-rajdhani font-black text-sm tracking-wider uppercase ${
                      draftVerdict.isStrengthA ? "text-[#00FF00]" : "text-[#FF4655]"
                    }`}>
                      {draftVerdict.titleA}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#ECE8E1]/80 leading-relaxed font-sans font-medium">
                    {draftVerdict.textA}
                  </p>
                </div>

                {/* Column Right (Team B Analysis) */}
                <div className="space-y-2 md:pl-6 pt-4 md:pt-0">
                  <div className="flex items-center space-x-2">
                    {draftVerdict.isStrengthB ? (
                      <div className="p-1 bg-[#00FF00]/10 border border-[#00FF00]/20 rounded-xs text-[#00FF00]">
                        <Shield size={14} className="fill-current" />
                      </div>
                    ) : (
                      <div className="p-1 bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-xs text-[#FF4655]">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M21 3a1 1 0 0 0-1.41 0l-7.09 7.09-1.42-1.42L18.17 1.6a1 1 0 0 0-1.41-1.41l-7.09 7.09-2.12-2.12a1 1 0 0 0-1.41 0l-4.24 4.24a1 1 0 0 0 0 1.41l2.12 2.12-2.83 2.83a2 2 0 0 0 0 2.83l2.83 2.83a2 2 0 0 0 2.83 0l2.83-2.83 2.12 2.12a1 1 0 0 0 1.41 0l4.24-4.24a1 1 0 0 0 0-1.41l-2.12-2.12 7.09-7.09A1 1 0 0 0 21 3z"/>
                        </svg>
                      </div>
                    )}
                    <span className={`font-rajdhani font-black text-sm tracking-wider uppercase ${
                      draftVerdict.isStrengthB ? "text-[#00FF00]" : "text-[#FF4655]"
                    }`}>
                      {draftVerdict.titleB}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#ECE8E1]/80 leading-relaxed font-sans font-medium">
                    {draftVerdict.textB}
                  </p>
                </div>
              </div>

              {/* DETAILED DUAL-SIDE ANALYSIS */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <span className="text-[10px] font-mono text-gray-400 tracking-widest uppercase font-bold block mb-1">{t('DETAILED_DUAL_SIDE_ANALYSIS')}</span>
                
                {/* Sub-Panel 1: Evaluasi Fase Menyerang */}
                <div className="bg-[#12161A]/60 border border-zinc-800 p-4">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-2 mb-3">
                    <span className="text-xs font-rajdhani font-black tracking-wider text-[#FF4655]">{t('EVALUASI_FASE_MENYERANG').toUpperCase()}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-500 uppercase">{t('TEAM_A_ATTACKING')}</span>
                      <p 
                        className="text-xs text-[#ECE8E1]/85 leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{ __html: generateDetailedSideAnalysis('Team A', teamA, 'attacker', activeMap ? activeMap.displayName : 'Ascent') }}
                      />
                    </div>
                    <div className="space-y-1 md:border-l md:border-white/5 md:pl-4">
                      <span className="text-[9px] font-mono text-gray-500 uppercase">{t('TEAM_B_ATTACKING')}</span>
                      <p 
                        className="text-xs text-[#ECE8E1]/85 leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{ __html: generateDetailedSideAnalysis('Team B', teamB, 'attacker', activeMap ? activeMap.displayName : 'Ascent') }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-Panel 2: Evaluasi Fase Bertahan */}
                <div className="bg-[#12161A]/60 border border-zinc-800 p-4">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-2 mb-3">
                    <span className="text-xs font-rajdhani font-black tracking-wider text-[#00F0FF]">{t('EVALUASI_FASE_BERTAHAN').toUpperCase()}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-500 uppercase">{t('TEAM_A_DEFENDING')}</span>
                      <p 
                        className="text-xs text-[#ECE8E1]/85 leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{ __html: generateDetailedSideAnalysis('Team A', teamA, 'defender', activeMap ? activeMap.displayName : 'Ascent') }}
                      />
                    </div>
                    <div className="space-y-1 md:border-l md:border-white/5 md:pl-4">
                      <span className="text-[9px] font-mono text-gray-500 uppercase">{t('TEAM_B_DEFENDING')}</span>
                      <p 
                        className="text-xs text-[#ECE8E1]/85 leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{ __html: generateDetailedSideAnalysis('Team B', teamB, 'defender', activeMap ? activeMap.displayName : 'Ascent') }}
                      />
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Audits & composition checklists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* TEAM A TACTICAL ANALYSIS */}
              <div className="bg-[#0F1215]/95 backdrop-blur-md border-2 border-[#FF4655]/30 shadow-[0_0_20px_rgba(255,70,85,0.05)] p-6 space-y-6">
                <div>
                  <div className="bg-[#FF4655]/10 border border-[#FF4655]/20 px-3 py-2 mb-4">
                    <h4 className="font-rajdhani font-black text-xs tracking-widest text-[#FF4655] uppercase">
                      TEAM A ROLE BALANCE CHECK
                    </h4>
                  </div>
                  
                  {/* Role Indicators with official dynamic icons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(calculationResult.roleBalanceA).map(([role, exists]) => {
                      const iconSrc = roleIcons[role];
                      return (
                        <div 
                          key={`auditA-${role}`}
                          className={`p-3 border transition duration-150 flex flex-col items-center justify-center ${
                            exists 
                              ? 'border-[#00FF00]/30 bg-[#00FF00]/5 text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.1)]' 
                              : 'border-[#FF4655]/30 bg-[#FF4655]/5 text-[#FF4655]'
                          }`}
                        >
                          {iconSrc ? (
                            <img 
                              src={iconSrc} 
                              alt={role} 
                              className={`w-6 h-6 object-contain mb-1.5 invert ${exists ? 'text-[#00FF00]' : 'opacity-30'}`} 
                            />
                          ) : (
                            <HelpCircle size={24} className="mb-1.5 opacity-30" />
                          )}
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold">{role}</span>
                          <span className="text-[8px] font-mono opacity-80 mt-0.5 uppercase">
                            {exists ? 'FILLED' : 'EMPTY'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Team A Synergies */}
                <div>
                  <span className="text-[10px] font-mono text-gray-300 font-bold uppercase tracking-widest block mb-2 border-b border-white/5 pb-1">DETECTED SYNERGIES</span>
                  {calculationResult.synergiesA.length === 0 ? (
                    <div className="text-[9px] font-mono text-gray-500 bg-black/40 p-3 border border-white/5 tracking-wider uppercase text-center">
                      NO SYNERGIES DETECTED FOR TEAM A
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {calculationResult.synergiesA.map((syn, idx) => {
                        const icons = syn.agents.map(name => agentMapByName[getNormalizedName(name)]?.displayIcon).filter(Boolean);
                        return (
                          <div key={`synA-${idx}`} className="flex items-center justify-between bg-black/40 border border-white/5 p-2">
                            <div className="flex items-center space-x-1.5">
                              {icons.map((ic, i) => (
                                <React.Fragment key={`synA-icon-${idx}-${i}`}>
                                  {i > 0 && <span className="text-xs text-gray-500 font-mono font-bold">+</span>}
                                  <img src={ic} alt="Agent icon" className="w-6 h-6 object-cover border border-white/10" />
                                </React.Fragment>
                              ))}
                              <span className="text-xs font-rajdhani font-bold text-white tracking-wider ml-1 uppercase">
                                {syn.agents.join(' + ')}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-[#00FF00] font-bold">+{syn.bonus.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Team B Counters against Team A */}
                <div>
                  <span className="text-[10px] font-mono text-gray-300 font-bold uppercase tracking-widest block mb-2 border-b border-white/5 pb-1">COUNTERED BY OPPONENT</span>
                  {calculationResult.countersB.length === 0 ? (
                    <div className="text-[9px] font-mono text-gray-500 bg-black/40 p-3 border border-white/5 tracking-wider uppercase text-center">
                      NO COUNTERS INFLICTED BY OPPONENT
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {calculationResult.countersB.map((c, idx) => {
                        const counterIcon = agentMapByName[getNormalizedName(c.counter)]?.displayIcon;
                        const targetIcon = agentMapByName[getNormalizedName(c.target)]?.displayIcon;
                        return (
                          <div key={`counterB-${idx}`} className="flex items-center justify-between bg-black/40 border border-[#FF4655]/15 p-2">
                            <div className="flex items-center space-x-2">
                              {counterIcon && <img src={counterIcon} alt="Counter agent" className="w-6 h-6 object-cover border border-[#00F0FF]/30" />}
                              <span className="text-xs font-mono text-gray-400">⚔️</span>
                              {targetIcon && <img src={targetIcon} alt="Target agent" className="w-6 h-6 object-cover border border-[#FF4655]/30" />}
                              <span className="text-xs font-rajdhani font-bold text-white uppercase tracking-wider">
                                {c.counter} COUNTERS {c.target}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-[#FF4655] font-bold">-{c.bonus.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* TEAM B TACTICAL ANALYSIS */}
              <div className="bg-[#0F1215]/95 backdrop-blur-md border-2 border-[#00F0FF]/30 shadow-[0_0_20px_rgba(0,240,255,0.05)] p-6 space-y-6">
                <div>
                  <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/20 px-3 py-2 mb-4">
                    <h4 className="font-rajdhani font-black text-xs tracking-widest text-[#00F0FF] uppercase">
                      TEAM B ROLE BALANCE CHECK
                    </h4>
                  </div>
                  
                  {/* Role Indicators with official dynamic icons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(calculationResult.roleBalanceB).map(([role, exists]) => {
                      const iconSrc = roleIcons[role];
                      return (
                        <div 
                          key={`auditB-${role}`}
                          className={`p-3 border transition duration-150 flex flex-col items-center justify-center ${
                            exists 
                              ? 'border-[#00FF00]/30 bg-[#00FF00]/5 text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.1)]' 
                              : 'border-[#FF4655]/30 bg-[#FF4655]/5 text-[#FF4655]'
                          }`}
                        >
                          {iconSrc ? (
                            <img 
                              src={iconSrc} 
                              alt={role} 
                              className={`w-6 h-6 object-contain mb-1.5 invert ${exists ? 'text-[#00FF00]' : 'opacity-30'}`} 
                            />
                          ) : (
                            <HelpCircle size={24} className="mb-1.5 opacity-30" />
                          )}
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold">{role}</span>
                          <span className="text-[8px] font-mono opacity-80 mt-0.5 uppercase">
                            {exists ? 'FILLED' : 'EMPTY'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Team B Synergies */}
                <div>
                  <span className="text-[10px] font-mono text-gray-300 font-bold uppercase tracking-widest block mb-2 border-b border-white/5 pb-1">DETECTED SYNERGIES</span>
                  {calculationResult.synergiesB.length === 0 ? (
                    <div className="text-[9px] font-mono text-gray-500 bg-black/40 p-3 border border-white/5 tracking-wider uppercase text-center">
                      NO SYNERGIES DETECTED FOR TEAM B
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {calculationResult.synergiesB.map((syn, idx) => {
                        const icons = syn.agents.map(name => agentMapByName[getNormalizedName(name)]?.displayIcon).filter(Boolean);
                        return (
                          <div key={`synB-${idx}`} className="flex items-center justify-between bg-black/40 border border-white/5 p-2">
                            <div className="flex items-center space-x-1.5">
                              {icons.map((ic, i) => (
                                <React.Fragment key={`synB-icon-${idx}-${i}`}>
                                  {i > 0 && <span className="text-xs text-gray-500 font-mono font-bold">+</span>}
                                  <img src={ic} alt="Agent icon" className="w-6 h-6 object-cover border border-white/10" />
                                </React.Fragment>
                              ))}
                              <span className="text-xs font-rajdhani font-bold text-white tracking-wider ml-1 uppercase">
                                {syn.agents.join(' + ')}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-[#00FF00] font-bold">+{syn.bonus.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Team A Counters against Team B */}
                <div>
                  <span className="text-[10px] font-mono text-gray-300 font-bold uppercase tracking-widest block mb-2 border-b border-white/5 pb-1">COUNTERED BY OPPONENT</span>
                  {calculationResult.countersA.length === 0 ? (
                    <div className="text-[9px] font-mono text-gray-500 bg-black/40 p-3 border border-white/5 tracking-wider uppercase text-center">
                      NO COUNTERS INFLICTED BY OPPONENT
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {calculationResult.countersA.map((c, idx) => {
                        const counterIcon = agentMapByName[getNormalizedName(c.counter)]?.displayIcon;
                        const targetIcon = agentMapByName[getNormalizedName(c.target)]?.displayIcon;
                        return (
                          <div key={`counterA-${idx}`} className="flex items-center justify-between bg-black/40 border border-[#FF4655]/15 p-2">
                            <div className="flex items-center space-x-2">
                              {counterIcon && <img src={counterIcon} alt="Counter agent" className="w-6 h-6 object-cover border border-[#FF4655]/30" />}
                              <span className="text-xs font-mono text-gray-400">⚔️</span>
                              {targetIcon && <img src={targetIcon} alt="Target agent" className="w-6 h-6 object-cover border border-[#00F0FF]/30" />}
                              <span className="text-xs font-rajdhani font-bold text-white uppercase tracking-wider">
                                {c.counter} COUNTERS {c.target}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-[#FF4655] font-bold">-{c.bonus.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* SELECT AGENT MODAL */}
      {modalOpen && activeSelectSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          
          <div className="relative w-full max-w-3xl bg-[#0F1215] border border-white/10 rounded-none shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <h3 className="font-rajdhani font-black text-xl tracking-wider text-white">
                  {t('SELECT_AGENT_FOR_TEAM', { team: activeSelectSlot.team === 'A' ? 'TEAM A' : 'TEAM B', slot: (activeSelectSlot.index + 1).toString() })}
                </h3>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  Choose a character to populate team composition coordinates
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-gray-500 hover:text-white font-mono text-sm tracking-widest uppercase cursor-pointer"
              >
                [{t('CLOSE')}]
              </button>
            </div>

            {/* Grid of Agents */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 overflow-y-auto pr-1 pb-4">
              {agents.map(a => {
                const sameTeamList = activeSelectSlot.team === 'A' ? teamA : teamB;
                const isAlreadyPicked = sameTeamList.includes(a.uuid);

                return (
                  <button
                    key={a.uuid}
                    disabled={isAlreadyPicked}
                    onClick={() => handleSelectAgent(a.uuid)}
                    className={`relative aspect-square border overflow-hidden p-0 cursor-pointer group flex flex-col justify-end transition ${
                      isAlreadyPicked
                        ? 'border-white/5 bg-black/40 opacity-20 cursor-not-allowed'
                        : activeSelectSlot.team === 'A'
                          ? 'border-white/10 hover:border-[#FF4655] bg-[#161a1e] hover:bg-[#FF4655]/15'
                          : 'border-white/10 hover:border-[#00F0FF] bg-[#161a1e] hover:bg-[#00F0FF]/15'
                    }`}
                  >
                    <img 
                      src={a.displayIcon} 
                      alt={a.displayName} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                    />
                    
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-1">
                      <span className="text-[8px] font-mono text-white block truncate uppercase text-center font-bold tracking-wider leading-none">
                        {a.displayName}
                      </span>
                    </div>

                    {a.role?.displayIcon && (
                      <div className="absolute top-1 left-1 w-4 h-4 bg-black/60 rounded-xs flex items-center justify-center p-0.5">
                        <img 
                          src={a.role.displayIcon} 
                          alt={a.role.displayName} 
                          className="w-full h-full object-contain invert opacity-70" 
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
