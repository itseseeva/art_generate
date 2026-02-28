import json, pathlib

p = pathlib.Path('frontend/public/locales/en/prompts.json')
data = json.loads(p.read_text(encoding='utf-8'))

data['location'] = {
    'bedroom': {'label': 'Passionate Bedroom', 'value': 'A spacious bedroom with a large bed dressed in satin sheets. Dark curtains drawn, the room in soft dimness. Candles flicker on the nightstand casting a warm glow. A faint scent of perfume lingers. A perfectly private, intimate space.'},
    'beach': {'label': 'Night Beach', 'value': 'A deserted beach under the full moon. Warm fine sand, the gentle lapping of waves at the shore. City lights glimmer in the distance. A starry sky overhead, salty sea air all around. Complete solitude and silence.'},
    'penthouse': {'label': 'Penthouse', 'value': 'A luxurious penthouse with floor-to-ceiling panoramic windows. The night city sparkles far below. A spacious living area with designer furniture, soft ambient lighting, and an open terrace overlooking the horizon.'},
    'springs': {'label': 'Hot Springs', 'value': 'A secluded natural spring nestled among rocks. Hot mineral water steams in the cool night air. Dense forest surrounds it for miles with no one in sight. Stars glimmer through drifting clouds of steam. Absolute silence and isolation.'},
    'office': {'label': "Director's Office", 'value': 'A spacious office with a heavy wooden desk. Blinds lowered, silence beyond the door. Shelves lined with documents, a laptop open on the desk. The scent of expensive coffee in the air. Door locked. An atmosphere of authority and order.'},
    'mansion': {'label': 'Abandoned Mansion', 'value': 'An old mansion where time seems to have stopped. High ceilings with ornate plasterwork, tarnished mirrors in gilded frames. A fire crackles in the hearth. Dust on antique furniture, creaking floorboards. A mysterious atmosphere from a bygone era.'},
    'plane': {'label': 'Private Jet', 'value': 'The cabin of a private jet: leather seats, soft lighting, the muffled hum of engines. Clouds and a night sky beyond the porthole. Complete privacy at 10,000 metres altitude.'},
    'cabin': {'label': 'Forest Cabin', 'value': 'A wooden cabin deep in the forest. The stove roars, logs crackling. Outside a blizzard rages; inside it is warm and cosy. A bearskin rug on the floor, the smell of timber and woodsmoke. Completely cut off from the outside world.'},
    'sauna': {'label': 'VIP Sauna', 'value': 'An elite Finnish sauna with cedar benches and a stone stove. Hot steam billows toward the ceiling. A small pool of ice-cold water waits nearby. The scent of juniper in the air. Fully private, no one around.'},
    'space': {'label': 'Space Station', 'value': 'The observation deck of an orbital station. A vast porthole reveals endless black space and the slowly rotating Earth. The quiet hum of life-support systems. Weightlessness and absolute silence outside.'},
    'dressing': {'label': 'Dressing Room', 'value': 'A cramped dressing room backstage. A mirror framed in bright bulbs, counters covered in cosmetics. Costumes hang on rails, the smell of greasepaint in the air. The audience murmurs just beyond the thin wall. Minutes until curtain call.'},
    'yacht': {'label': 'Yacht at Sea', 'value': 'A gleaming white yacht adrift in open water. Nothing around but sea and sky. A bubbling jacuzzi on deck, a wide bed and portholes in the cabin below. The swell barely perceptible. Total seclusion.'},
    'dungeon': {'label': 'Castle Dungeon', 'value': 'A damp stone dungeon beneath a medieval castle. Torches on the walls flicker, throwing long shadows. A heavy smell of stone and moisture. Chains hang from the ceiling. A dark and mysterious atmosphere.'},
    'greenhouse': {'label': 'Greenhouse', 'value': 'A spacious glass greenhouse filled with tropical plants. The air is warm and humid, fragrant with flowers and soil. Misted panes diffuse the light softly. Rare exotic orchids in every corner. A quiet, secluded spot hidden from the world.'},
    'roof': {'label': 'Rooftop', 'value': 'The flat roof of a high-rise in the city centre. A breeze stirs the air; the night skyline glitters far below. Stars overhead, the hum of traffic barely audible. The feeling that the whole city lies at your feet. Not a soul in sight.'},
    'library': {'label': 'Forbidden Library', 'value': 'A secret section of an old library. Towering shelves reaching the ceiling, lined with rare editions. Half-light, the smell of aged paper and leather bindings. Rarely visited. Absolute silence, broken only by the occasional creak of a floorboard.'},
    'train': {'label': 'Luxury Train', 'value': 'A first-class compartment on a night express. Velvet upholstery, soft lighting, the rhythmic clatter of wheels. Dark forests rush past the window. The carriage is nearly empty, no neighbours.'},
    'tent': {'label': 'Mountain Tent', 'value': 'A small tent on a high alpine plateau. Outside the wind howls and drives icy pellets against the fabric. Inside it is cramped but warm. A scattering of stars visible through a gap in the tent. The nearest settlement is hours away.'},
    'studio': {'label': 'Erotic Photo Studio', 'value': 'A professional photo studio. Powerful lights, colour gels, several backdrop rolls. A daybed and a chair in the centre. Cameras on tripods stand idle. The space is locked and entirely private.'},
    'throne': {'label': 'Throne Room', 'value': 'A majestic throne room in a medieval palace. A high gilded throne on a dais, a red carpet runner. Columns, tapestries, torches around the perimeter. Every sound echoes through the vast space. An atmosphere of absolute power.'},
    'club': {'label': 'Nightclub', 'value': 'A dark, secluded corner of a nightclub VIP section. Music pounds so hard the air vibrates. Coloured strobes cut through the haze. In this tucked-away spot it is perfectly dark and completely deserted.'},
    'garage': {'label': 'Garage', 'value': 'A spacious private garage. Dim fluorescent light, the smell of engine oil and rubber. An expensive car parked against the wall, metal shelving loaded with tools. The roller door is shut, nobody outside.'},
    'elevator': {'label': 'Elevator', 'value': 'A stuck elevator in a business centre. Mirrors covering every wall, chrome handrails. The emergency light blinks; the ventilation hums faintly. The intercom button gets no response. A tight, enclosed space.'},
    'kitchen': {'label': 'Kitchen', 'value': 'A spacious kitchen late in the evening. Soft light over the worktop, the lingering smell of a recent meal. A large wooden table in the centre. Everything tidied up, the sink clean. Quiet, the others retired to their rooms long ago.'}
}

p.write_text(json.dumps(data, ensure_ascii=False, indent=4), encoding='utf-8')
print('EN locations updated successfully')
