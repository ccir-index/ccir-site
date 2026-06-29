const EXPLORER_DATA={
 "asof": "2026-06-25",
 "anchors": {
  "CoreWeave": {
   "A100": 2.7,
   "H100": 6.16,
   "H200": 6.3,
   "B200": 8.6,
   "GB200": 10.5,
   "GB300": 12.0
  },
  "Nebius": {
   "A100": 1.79,
   "H100": 3.85,
   "H200": 4.5,
   "B200": 7.15,
   "GB200": 13.52,
   "GB300": 12.0
  },
  "IREN": {
   "A100": 1.39,
   "H100": 2.69,
   "H200": 3.59,
   "B200": 5.98,
   "GB200": 13.52,
   "GB300": 12.0
  },
  "Applied Digital": {
   "A100": 1.39,
   "H100": 2.69,
   "H200": 3.59,
   "B200": 5.98,
   "GB200": 13.52,
   "GB300": 12.0
  }
 },
 "anchor_basis": {
  "CoreWeave": {
   "A100": "own",
   "H100": "own",
   "H200": "own",
   "B200": "own",
   "GB200": "own",
   "GB300": "proxy"
  },
  "Nebius": {
   "A100": "market",
   "H100": "own",
   "H200": "own",
   "B200": "own",
   "GB200": "market",
   "GB300": "proxy"
  },
  "IREN": {
   "A100": "t3proxy",
   "H100": "t3proxy",
   "H200": "t3proxy",
   "B200": "t3proxy",
   "GB200": "market",
   "GB300": "proxy"
  },
  "Applied Digital": {
   "A100": "t3proxy",
   "H100": "t3proxy",
   "H200": "t3proxy",
   "B200": "t3proxy",
   "GB200": "market",
   "GB300": "proxy"
  }
 },
 "commit3y": {
  "A100": 1.71,
  "H100": 5.48,
  "H200": 5.21,
  "B200": null,
  "GB200": 5.95,
  "GB300": null
 },
 "commit1y": {
  "A100": 2.4,
  "H100": 7.98,
  "H200": 7.56,
  "B200": null,
  "GB200": 8.65,
  "GB300": null
 },
 "dtilt": {
  "A100": 0.55,
  "H100": 0.8,
  "H200": 0.88,
  "B200": 0.95,
  "GB200": 0.96,
  "GB300": 0.98
 },
 "termdisc": {
  "premium": {
   "y1": 0.36,
   "y3": 0.56,
   "repr": 0.5
  },
  "wholesale": {
   "y1": 0.07,
   "y3": 0.18,
   "repr": 0.15
  }
 },
 "termrates": {
  "CoreWeave": {},
  "Nebius": {},
  "IREN": {},
  "Applied Digital": {}
 },
 "cost": {
  "A100": 20000,
  "H100": 40000,
  "H200": 47000,
  "B200": 52000,
  "GB200": 62000,
  "GB300": 70000
 },
 "hours": 2190,
 "scenarios": [
  {
   "op": "CoreWeave",
   "q": "Mar'25",
   "idx": 2.0,
   "R": 1.65,
   "ramp": 1.0,
   "bookc": 98.0,
   "ppe": 10746.0,
   "ppe_begin": 9147.0,
   "rev": 981.6,
   "deployed": 295.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "premium",
   "mix": {
    "A100": 12,
    "H100": 69,
    "H200": 19,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "CoreWeave",
   "q": "Jun'25",
   "idx": 3.0,
   "R": 1.7,
   "ramp": 1.0,
   "bookc": 98.0,
   "ppe": 13170.0,
   "ppe_begin": 10746.0,
   "rev": 1212.8,
   "deployed": 358.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "premium",
   "mix": {
    "A100": 10,
    "H100": 66,
    "H200": 21,
    "B200": 1,
    "GB200": 2,
    "GB300": 0
   }
  },
  {
   "op": "CoreWeave",
   "q": "Sep'25",
   "idx": 4.0,
   "R": 1.56,
   "ramp": 1.0,
   "bookc": 98.0,
   "ppe": 16500.0,
   "ppe_begin": 13170.0,
   "rev": 1364.7,
   "deployed": 440.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "premium",
   "mix": {
    "A100": 8,
    "H100": 61,
    "H200": 25,
    "B200": 3,
    "GB200": 3,
    "GB300": 0
   }
  },
  {
   "op": "CoreWeave",
   "q": "Dec'25",
   "idx": 5.0,
   "R": 1.48,
   "ramp": 1.0,
   "bookc": 98.0,
   "ppe": 20903.0,
   "ppe_begin": 16500.0,
   "rev": 1572.0,
   "deployed": 530.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "premium",
   "mix": {
    "A100": 6,
    "H100": 55,
    "H200": 29,
    "B200": 5,
    "GB200": 5,
    "GB300": 0
   }
  },
  {
   "op": "CoreWeave",
   "q": "Mar'26",
   "idx": 6.0,
   "R": 1.63,
   "ramp": 1.0,
   "bookc": 98.0,
   "ppe": 26627.0,
   "ppe_begin": 20903.0,
   "rev": 2078.0,
   "deployed": 637.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "premium",
   "mix": {
    "A100": 5,
    "H100": 49,
    "H200": 27,
    "B200": 7,
    "GB200": 8,
    "GB300": 4
   }
  },
  {
   "op": "IREN",
   "q": "Sep'24",
   "idx": 0.0,
   "R": 1.7,
   "ramp": 1.0,
   "bookc": 80.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 3.2,
   "deployed": 0.9,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "wholesale",
   "mix": {
    "A100": 0,
    "H100": 85,
    "H200": 15,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "IREN",
   "q": "Dec'24",
   "idx": 1.0,
   "R": 1.15,
   "ramp": 1.0,
   "bookc": 80.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 2.7,
   "deployed": 1.1,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "wholesale",
   "mix": {
    "A100": 0,
    "H100": 82,
    "H200": 18,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "IREN",
   "q": "Mar'25",
   "idx": 2.0,
   "R": 1.18,
   "ramp": 1.0,
   "bookc": 80.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 3.6,
   "deployed": 1.4,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "wholesale",
   "mix": {
    "A100": 0,
    "H100": 80,
    "H200": 20,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "IREN",
   "q": "Jun'25",
   "idx": 3.0,
   "R": 1.68,
   "ramp": 1.0,
   "bookc": 80.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 7.0,
   "deployed": 1.9,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "wholesale",
   "mix": {
    "A100": 0,
    "H100": 78,
    "H200": 22,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "IREN",
   "q": "Dec'25",
   "idx": 5.0,
   "R": 0.83,
   "ramp": 1.0,
   "bookc": 80.0,
   "ppe": 710.7,
   "ppe_begin": 76.0,
   "rev": 17.298,
   "deployed": 17.0,
   "act_default": 44.0,
   "stale": false,
   "prov": false,
   "term_tier": "wholesale",
   "mix": {
    "A100": 0,
    "H100": 78,
    "H200": 22,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "IREN",
   "q": "Mar'26",
   "idx": 6.0,
   "R": 0.7,
   "ramp": 1.0,
   "bookc": 80.0,
   "ppe": 1113.2,
   "ppe_begin": 710.7,
   "rev": 33.635,
   "deployed": 27.0,
   "act_default": 37.0,
   "stale": false,
   "prov": false,
   "term_tier": "wholesale",
   "mix": {
    "A100": 0,
    "H100": 78,
    "H200": 22,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "Nebius",
   "q": "Dec'24",
   "idx": 1.0,
   "R": 0.5,
   "ramp": 1.0,
   "bookc": 90.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 23.8,
   "deployed": 27.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "premium",
   "mix": {
    "A100": 0,
    "H100": 70,
    "H200": 30,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "Nebius",
   "q": "Mar'25",
   "idx": 2.0,
   "R": 0.6,
   "ramp": 1.0,
   "bookc": 90.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 41.0,
   "deployed": 36.0,
   "act_default": null,
   "stale": false,
   "prov": true,
   "term_tier": "premium",
   "mix": {
    "A100": 0,
    "H100": 55,
    "H200": 45,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "Nebius",
   "q": "Jun'25",
   "idx": 3.0,
   "R": 1.07,
   "ramp": 1.0,
   "bookc": 90.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 94.0,
   "deployed": 45.0,
   "act_default": null,
   "stale": false,
   "prov": true,
   "term_tier": "premium",
   "mix": {
    "A100": 0,
    "H100": 45,
    "H200": 55,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "Nebius",
   "q": "Sep'25",
   "idx": 4.0,
   "R": 1.21,
   "ramp": 1.0,
   "bookc": 90.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 131.1,
   "deployed": 54.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "premium",
   "mix": {
    "A100": 0,
    "H100": 40,
    "H200": 55,
    "B200": 5,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "Nebius",
   "q": "Dec'25",
   "idx": 5.0,
   "R": 1.25,
   "ramp": 1.0,
   "bookc": 90.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 214.0,
   "deployed": 120.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "premium",
   "mix": {
    "A100": 0,
    "H100": 30,
    "H200": 55,
    "B200": 15,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "Nebius",
   "q": "Mar'26",
   "idx": 6.0,
   "R": 1.4,
   "ramp": 1.0,
   "bookc": 90.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 390.0,
   "deployed": 160.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "premium",
   "mix": {
    "A100": 0,
    "H100": 28,
    "H200": 52,
    "B200": 20,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "Applied Digital",
   "q": "FY25",
   "idx": 2.5,
   "R": 1.25,
   "ramp": 1.0,
   "bookc": 70.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": null,
   "deployed": 6.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "wholesale",
   "mix": {
    "A100": 0,
    "H100": 100,
    "H200": 0,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  },
  {
   "op": "Applied Digital",
   "q": "Mar'26",
   "idx": 6.0,
   "R": 1.1,
   "ramp": 1.0,
   "bookc": 70.0,
   "ppe": null,
   "ppe_begin": null,
   "rev": 18.0,
   "deployed": 6.0,
   "act_default": null,
   "stale": false,
   "prov": false,
   "term_tier": "wholesale",
   "mix": {
    "A100": 0,
    "H100": 100,
    "H200": 0,
    "B200": 0,
    "GB200": 0,
    "GB300": 0
   }
  }
 ]
};
