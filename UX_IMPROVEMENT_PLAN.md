# UX Improvement Plan - Simplified Scene Generation Workflow

## Problem Statement
User feedback: "i hate the confusing way in which theres a run button and an auto spawn and its unclear how it works. the heuristics are just lazy here."

## Current Confusing UX

### What exists now:
1. **RUN button** (appears in 2 places) - Executes user's prompt once
2. **AUTO SPAWN toggle** - Generates random scenes every 15s (ignores user prompt OR uses it)
3. **Prompt field** - User enters scene description

### Why it's confusing:
- Two separate controls doing similar things
- "AUTO SPAWN" name doesn't explain what it does
- Unclear if AUTO SPAWN uses your prompt or ignores it (it does BOTH depending on whether prompt is empty)
- RUN button appears twice in UI (redundant)
- No clear workflow: "Do I type a prompt and click RUN? Or enable AUTO SPAWN?"

## Proposed Simplified UX

### Single Clear Workflow:

```
┌─────────────────────────────────────────────────────────────┐
│  SCENE GENERATOR                                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Describe your scene:                                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ wooden table with metal tools and rubber balls          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  [ GENERATE SCENE ]          [▶ Play] [⏸ Pause] [↻ Reset]   │
│                                                               │
│  ☐ Auto-regenerate (creates variations every 15s)           │
│                                                               │
│  Current Physics: Earth Gravity (-9.81 m/s²)                │
│  Objects: 3 tables, 5 tools, 10 balls                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Changes:

1. **Single "GENERATE SCENE" button**
   - Always uses the prompt you typed
   - Clear name: you know it generates a scene
   - No ambiguity

2. **Optional "Auto-regenerate" checkbox**
   - OFF by default (manual control)
   - When ON: Repeats YOUR prompt with variations every 15s
   - Clear label explains it creates variations
   - Not a mysterious separate feature

3. **Clear status display**
   - Shows current physics mode extracted from prompt
   - Shows object counts
   - User sees what the AI understood from their prompt

4. **Remove confusion:**
   - No "RUN" button (what does "run" mean? Running what?)
   - No "AUTO SPAWN" (what's spawning? Random scenes? My scene?)
   - Single workflow: Type → Generate → Optionally enable auto-variations

## Implementation Changes

### ControlPanel.tsx Changes:

**BEFORE:**
```typescript
<button onClick={onAnalyze}>RUN</button>
<button onClick={toggleAutoSpawn}>AUTO SPAWN</button>
```

**AFTER:**
```typescript
<button onClick={onAnalyze} disabled={!prompt.trim()}>
  {isAnalyzing ? (
    <>
      <Loader className="w-4 h-4 animate-spin" />
      Generating...
    </>
  ) : (
    <>
      <Sparkles className="w-4 h-4" />
      GENERATE SCENE
    </>
  )}
</button>

<label className="flex items-center gap-2 text-sm cursor-pointer">
  <input
    type="checkbox"
    checked={isAutoSpawn}
    onChange={toggleAutoSpawn}
    className="w-4 h-4"
  />
  <span>Auto-regenerate (creates variations every 15s)</span>
  {isAutoSpawn && <Activity className="w-4 h-4 text-purple-400 animate-pulse" />}
</label>

{/* Status display */}
<div className="bg-slate-800/50 p-3 rounded text-sm">
  <div className="flex items-center gap-2 mb-1">
    <ArrowDown className="w-4 h-4 text-cyan-400" />
    <span className="font-bold">Current Physics:</span>
    <span>{getPhysicsModeName(params.movementBehavior, params.gravity)}</span>
  </div>
  <div className="flex items-center gap-2">
    <Cube className="w-4 h-4 text-green-400" />
    <span className="font-bold">Objects:</span>
    <span>{params.assetGroups.map(g => `${g.count} ${g.name}`).join(', ')}</span>
  </div>
</div>
```

### App.tsx Auto-regenerate Logic:

**Current behavior (confusing):**
- If prompt is empty → Generate random procedural scenes
- If prompt exists → Use AI with that prompt

**New behavior (clear):**
- Auto-regenerate checkbox ONLY works if you have a prompt
- Always uses YOUR prompt, just creates variations
- If no prompt: Show message "Enter a prompt to enable auto-regenerate"

```typescript
useEffect(() => {
  if (isAutoSpawn) {
    if (!prompt.trim()) {
      // Disable auto-regenerate if no prompt
      setIsAutoSpawn(false);
      addLog('Auto-regenerate requires a prompt. Type a scene description first.', 'warning');
      return;
    }

    const generateVariation = () => {
      // ALWAYS use user's prompt, AI generates variations
      addLog(`Auto-regenerating variation of: "${prompt}"`, 'info');
      executeAnalysis(prompt, 'AUTO');
    };

    // Initial generation
    generateVariation();

    // Repeat every 15s
    autoSpawnTimerRef.current = window.setInterval(generateVariation, 15000);
  } else {
    if (autoSpawnTimerRef.current) {
      clearInterval(autoSpawnTimerRef.current);
      autoSpawnTimerRef.current = null;
    }
  }

  return () => {
    if (autoSpawnTimerRef.current) clearInterval(autoSpawnTimerRef.current);
  };
}, [isAutoSpawn, prompt, executeAnalysis]);
```

## User Testing Flow

### Scenario 1: First-time user
1. Opens app
2. Sees empty prompt field and grayed-out "GENERATE SCENE" button
3. Types "meeting room with laptops"
4. Button becomes active
5. Clicks "GENERATE SCENE"
6. Scene appears
7. Sees status: "Current Physics: Earth Gravity, Objects: 1 floor, 1 table, 4 chairs, 3 laptops"
8. ✅ **Clear workflow, no confusion**

### Scenario 2: Dataset generation
1. User has a prompt: "surgical robot with instruments"
2. Clicks "GENERATE SCENE" → Works
3. Checks "Auto-regenerate" checkbox
4. Every 15s, gets a NEW variation of the same surgical robot scene
5. Different instrument positions, slightly different layouts
6. All variations use same physics (extracted from original prompt)
7. ✅ **Perfect for generating diverse training data from single concept**

### Scenario 3: Error case
1. User enables "Auto-regenerate" without typing a prompt
2. System PREVENTS it and shows: "Enter a prompt to enable auto-regenerate"
3. Checkbox unchecks automatically
4. ✅ **No confusing behavior**

## Implementation Priority

1. **P0 - Update button labels** (5 minutes)
   - "RUN" → "GENERATE SCENE"
   - "AUTO SPAWN" → Checkbox with "Auto-regenerate (creates variations every 15s)"

2. **P0 - Fix auto-regenerate logic** (10 minutes)
   - Require prompt for auto-regenerate
   - Always use user's prompt (no random procedural fallback)

3. **P1 - Add status display** (15 minutes)
   - Show current physics mode
   - Show object counts

4. **P1 - Add helper text** (5 minutes)
   - Tooltip on "Auto-regenerate" explaining it creates variations
   - Placeholder text in prompt field with examples

## Testing Checklist

- [ ] Empty prompt disables "GENERATE SCENE" button
- [ ] Typing prompt enables button
- [ ] Button shows "Generating..." state while processing
- [ ] Auto-regenerate checkbox only works with prompt
- [ ] Auto-regenerate creates variations of SAME concept (not random scenes)
- [ ] Status display updates after generation
- [ ] Clear error messages if generation fails

## Expected Outcome

**Before (confusing):**
- User: "Do I click RUN or enable AUTO SPAWN?"
- User: "What's the difference?"
- User: "Why did AUTO SPAWN ignore my prompt?"

**After (clear):**
- User: "I type a prompt and click GENERATE SCENE"
- User: "If I want variations, I check Auto-regenerate"
- User: "It always uses my prompt, just creates different layouts"

✅ **Single clear workflow, no confusion**
