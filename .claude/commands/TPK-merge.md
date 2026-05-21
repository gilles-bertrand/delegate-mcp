---
description: Fusionner la branche courante dans une branche cible (main par défaut)
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
model: haiku
argument-hint: [target-branch]
---

# TPK-merge

## Purpose

Fusionner la branche courante dans une branche cible. Par défaut la cible est `main`, mais si un nom de branche est passé en argument, c'est celui-là qui est utilisé.

## Variables

ARGUMENTS: $ARGUMENTS

## Instructions

- La branche cible par défaut est `main`
- Si ARGUMENTS est fourni, utiliser cette valeur comme branche cible
- Vérifier que le working tree est propre avant de merger
- Utiliser `git merge --no-ff` pour conserver l'historique
- Toujours afficher le résumé final

## Workflow

1. **Déterminer la branche cible**
   - Si ARGUMENTS est non vide, utiliser ARGUMENTS comme branche cible
   - Sinon, utiliser `main`

2. **Vérifier l'état du dépôt**
   - Exécuter `git status --short`
   - Si des changements non commités existent, informer l'utilisateur et s'arrêter

3. **Identifier la branche courante**
   - Exécuter `git branch --show-current`
   - Si déjà sur la branche cible, informer l'utilisateur et s'arrêter

4. **Effectuer le merge**
   - Se placer sur la branche cible : `git checkout [target-branch]`
   - Merger : `git merge --no-ff [current-branch] -m "merge: [current-branch] into [target-branch]"`
   - En cas de conflit, lister les fichiers en conflit et demander à l'utilisateur de les résoudre

5. **Rapport**
   - Afficher le hash du commit de merge
   - Suggérer un `git push` si pertinent

## Report

```
TPK-merge Complete

Branche source : [current-branch]
Branche cible  : [target-branch]
Status : SUCCESS / FAILED / CONFLICTS

Commit : [hash]

Next: git push origin [target-branch]
```
