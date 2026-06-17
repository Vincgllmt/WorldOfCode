import type { Replay } from '@/components/arena/gameViewer'

import type { ColorsFrame, ColorsInit } from './types'

/**
 * Replay mocké de « Caméléon Caméléon » (généré depuis le referee réel).
 * Combo 1 → 2 → 3 réussi : permet de développer/voir le visuel sans Piston.
 */
export const chameleonColorsMock: Replay<ColorsInit, ColorsFrame> = {
  "init": {
    "cols": 8,
    "rows": 6,
    "walls": [
      [
        1,
        1
      ],
      [
        4,
        1
      ],
      [
        1,
        3
      ],
      [
        4,
        3
      ]
    ],
    "start": [
      0,
      0
    ],
    "fruits": [
      {
        "pos": [
          3,
          0
        ],
        "color": "R"
      },
      {
        "pos": [
          5,
          0
        ],
        "color": "R"
      },
      {
        "pos": [
          2,
          2
        ],
        "color": "G"
      },
      {
        "pos": [
          6,
          2
        ],
        "color": "B"
      },
      {
        "pos": [
          1,
          4
        ],
        "color": "G"
      },
      {
        "pos": [
          3,
          4
        ],
        "color": "R"
      },
      {
        "pos": [
          5,
          4
        ],
        "color": "G"
      },
      {
        "pos": [
          2,
          5
        ],
        "color": "B"
      },
      {
        "pos": [
          6,
          5
        ],
        "color": "B"
      }
    ],
    "target": 3,
    "budget": 60
  },
  "frames": [
    {
      "pos": [
        0,
        0
      ],
      "skin": null,
      "event": "start",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 1,
        "count": 0,
        "color": null,
        "completed": 0
      },
      "score": 0
    },
    {
      "pos": [
        0,
        0
      ],
      "skin": "B",
      "event": "skin",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 1,
        "count": 0,
        "color": null,
        "completed": 0
      },
      "score": 0
    },
    {
      "pos": [
        0,
        1
      ],
      "skin": "B",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 1,
        "count": 0,
        "color": null,
        "completed": 0
      },
      "score": 0
    },
    {
      "pos": [
        0,
        2
      ],
      "skin": "B",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 1,
        "count": 0,
        "color": null,
        "completed": 0
      },
      "score": 0
    },
    {
      "pos": [
        0,
        3
      ],
      "skin": "B",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 1,
        "count": 0,
        "color": null,
        "completed": 0
      },
      "score": 0
    },
    {
      "pos": [
        0,
        4
      ],
      "skin": "B",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 1,
        "count": 0,
        "color": null,
        "completed": 0
      },
      "score": 0
    },
    {
      "pos": [
        0,
        5
      ],
      "skin": "B",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 1,
        "count": 0,
        "color": null,
        "completed": 0
      },
      "score": 0
    },
    {
      "pos": [
        1,
        5
      ],
      "skin": "B",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 1,
        "count": 0,
        "color": null,
        "completed": 0
      },
      "score": 0
    },
    {
      "pos": [
        2,
        5
      ],
      "skin": "B",
      "event": "eat",
      "eaten": [
        2,
        5
      ],
      "eatenColor": "B",
      "series": {
        "target": 2,
        "count": 0,
        "color": null,
        "completed": 1
      },
      "score": 50
    },
    {
      "pos": [
        2,
        5
      ],
      "skin": "G",
      "event": "skin",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 2,
        "count": 0,
        "color": null,
        "completed": 1
      },
      "score": 50
    },
    {
      "pos": [
        2,
        4
      ],
      "skin": "G",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 2,
        "count": 0,
        "color": null,
        "completed": 1
      },
      "score": 50
    },
    {
      "pos": [
        1,
        4
      ],
      "skin": "G",
      "event": "eat",
      "eaten": [
        1,
        4
      ],
      "eatenColor": "G",
      "series": {
        "target": 2,
        "count": 1,
        "color": "G",
        "completed": 1
      },
      "score": 50
    },
    {
      "pos": [
        2,
        4
      ],
      "skin": "G",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 2,
        "count": 1,
        "color": "G",
        "completed": 1
      },
      "score": 50
    },
    {
      "pos": [
        2,
        3
      ],
      "skin": "G",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 2,
        "count": 1,
        "color": "G",
        "completed": 1
      },
      "score": 50
    },
    {
      "pos": [
        2,
        2
      ],
      "skin": "G",
      "event": "eat",
      "eaten": [
        2,
        2
      ],
      "eatenColor": "G",
      "series": {
        "target": 3,
        "count": 0,
        "color": null,
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        2,
        2
      ],
      "skin": "R",
      "event": "skin",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 3,
        "count": 0,
        "color": null,
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        2,
        1
      ],
      "skin": "R",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 3,
        "count": 0,
        "color": null,
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        2,
        0
      ],
      "skin": "R",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 3,
        "count": 0,
        "color": null,
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        3,
        0
      ],
      "skin": "R",
      "event": "eat",
      "eaten": [
        3,
        0
      ],
      "eatenColor": "R",
      "series": {
        "target": 3,
        "count": 1,
        "color": "R",
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        4,
        0
      ],
      "skin": "R",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 3,
        "count": 1,
        "color": "R",
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        5,
        0
      ],
      "skin": "R",
      "event": "eat",
      "eaten": [
        5,
        0
      ],
      "eatenColor": "R",
      "series": {
        "target": 3,
        "count": 2,
        "color": "R",
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        5,
        1
      ],
      "skin": "R",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 3,
        "count": 2,
        "color": "R",
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        5,
        2
      ],
      "skin": "R",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 3,
        "count": 2,
        "color": "R",
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        5,
        3
      ],
      "skin": "R",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 3,
        "count": 2,
        "color": "R",
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        5,
        4
      ],
      "skin": "R",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 3,
        "count": 2,
        "color": "R",
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        4,
        4
      ],
      "skin": "R",
      "event": "move",
      "eaten": null,
      "eatenColor": null,
      "series": {
        "target": 3,
        "count": 2,
        "color": "R",
        "completed": 2
      },
      "score": 100
    },
    {
      "pos": [
        3,
        4
      ],
      "skin": "R",
      "event": "eat",
      "eaten": [
        3,
        4
      ],
      "eatenColor": "R",
      "series": {
        "target": 4,
        "count": 0,
        "color": null,
        "completed": 3
      },
      "score": 150
    }
  ]
}
