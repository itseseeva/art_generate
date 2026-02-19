import { useTranslation } from 'react-i18next';

export const useCharacterPrompts = () => {
    const { t, i18n } = useTranslation('prompts');

    const namesRu = [
        "Александра", "Мария", "Елена", "Анна", "Ольга",
        "Татьяна", "Наталья", "Ирина", "Светлана", "Екатерина",
        "Юлия", "Анастасия", "Виктория", "Дарья", "Ксения",
        "Елизавета", "Алиса", "Вероника", "Полина", "Маргарита"
    ];

    const namesEn = [
        "Alexandra", "Maria", "Elena", "Anna", "Olga",
        "Tatiana", "Natalia", "Irina", "Svetlana", "Ekaterina",
        "Julia", "Anastasia", "Victoria", "Daria", "Xenia",
        "Elizabeth", "Alice", "Veronica", "Polina", "Margarita"
    ];

    const names = i18n.language === 'ru' ? namesRu : namesEn;

    const personality = [
        { label: t('personality.passionate.label'), value: t('personality.passionate.value') },
        { label: t('personality.dominant.label'), value: t('personality.dominant.value') },
        { label: t('personality.submissive.label'), value: t('personality.submissive.value') },
        { label: t('personality.playful.label'), value: t('personality.playful.value') },
        { label: t('personality.innocent.label'), value: t('personality.innocent.value') },
        { label: t('personality.experienced.label'), value: t('personality.experienced.value') },
        { label: t('personality.jealous.label'), value: t('personality.jealous.value') },
        { label: t('personality.seductive.label'), value: t('personality.seductive.value') },
        { label: t('personality.nympho.label'), value: t('personality.nympho.value') },
        { label: t('personality.perverted.label'), value: t('personality.perverted.value') },
        { label: t('personality.femmeFatale.label'), value: t('personality.femmeFatale.value') },
        { label: t('personality.shy.label'), value: t('personality.shy.value') },
        { label: t('personality.aggressive.label'), value: t('personality.aggressive.value') },
        { label: t('personality.vulgar.label'), value: t('personality.vulgar.value') },
        { label: t('personality.manipulative.label'), value: t('personality.manipulative.value') },
        { label: t('personality.lover.label'), value: t('personality.lover.value') },
        { label: t('personality.mistress.label'), value: t('personality.mistress.value') },
        { label: t('personality.slave.label'), value: t('personality.slave.value') },
        { label: t('personality.insatiable.label'), value: t('personality.insatiable.value') },
        { label: t('personality.fantasy.label'), value: t('personality.fantasy.value') },
    ];

    const situation = [
        { label: t('situation.night.label'), value: t('situation.night.value') },
        { label: t('situation.office.label'), value: t('situation.office.value') },
        { label: t('situation.train.label'), value: t('situation.train.value') },
        { label: t('situation.doctor.label'), value: t('situation.doctor.value') },
        { label: t('situation.teacher.label'), value: t('situation.teacher.value') },
        { label: t('situation.massage.label'), value: t('situation.massage.value') },
        { label: t('situation.elevator.label'), value: t('situation.elevator.value') },
        { label: t('situation.beach.label'), value: t('situation.beach.value') },
        { label: t('situation.gym.label'), value: t('situation.gym.value') },
        { label: t('situation.neighbor.label'), value: t('situation.neighbor.value') },
        { label: t('situation.cleaning.label'), value: t('situation.cleaning.value') },
        { label: t('situation.photoshoot.label'), value: t('situation.photoshoot.value') },
        { label: t('situation.cabin.label'), value: t('situation.cabin.value') },
        { label: t('situation.club.label'), value: t('situation.club.value') },
        { label: t('situation.fantasy.label'), value: t('situation.fantasy.value') },
        { label: t('situation.lab.label'), value: t('situation.lab.value') },
        { label: t('situation.library.label'), value: t('situation.library.value') },
        { label: t('situation.castle.label'), value: t('situation.castle.value') },
        { label: t('situation.home.label'), value: t('situation.home.value') },
        { label: t('situation.meeting.label'), value: t('situation.meeting.value') },
        { label: t('situation.springs.label'), value: t('situation.springs.value') },
        { label: t('situation.sauna.label'), value: t('situation.sauna.value') },
    ];

    const instructions = [
        t('instructions.frank'), t('instructions.dirty'), t('instructions.hints'), t('instructions.descriptive'),
        t('instructions.flirt'), t('instructions.passionate'), t('instructions.experienced'), t('instructions.whisper'),
        t('instructions.loud'), t('instructions.explicit'), t('instructions.dominant'), t('instructions.submissive'),
        t('instructions.advice'), t('instructions.jokes'), t('instructions.aggressive'), t('instructions.direct'),
        t('instructions.greedy'), t('instructions.innocent'), t('instructions.perverted'), t('instructions.prostitute')
    ];

    const appearance = [
        { label: t('appearance.blonde.label'), value: t('appearance.blonde.value') },
        { label: t('appearance.redhead.label'), value: t('appearance.redhead.value') },
        { label: t('appearance.brunette.label'), value: t('appearance.brunette.value') },
        { label: t('appearance.gothic.label'), value: t('appearance.gothic.value') },
        { label: t('appearance.sporty.label'), value: t('appearance.sporty.value') },
        { label: t('appearance.elf.label'), value: t('appearance.elf.value') },
        { label: t('appearance.cyberpunk.label'), value: t('appearance.cyberpunk.value') },
        { label: t('appearance.asian.label'), value: t('appearance.asian.value') },
        { label: t('appearance.curvy.label'), value: t('appearance.curvy.value') },
        { label: t('appearance.student.label'), value: t('appearance.student.value') },
        { label: t('appearance.femmeFatale.label'), value: t('appearance.femmeFatale.value') },
        { label: t('appearance.neighbor.label'), value: t('appearance.neighbor.value') },
        { label: t('appearance.nurse.label'), value: t('appearance.nurse.value') },
        { label: t('appearance.catwoman.label'), value: t('appearance.catwoman.value') },
        { label: t('appearance.succubus.label'), value: t('appearance.succubus.value') },
        { label: t('appearance.angel.label'), value: t('appearance.angel.value') },
        { label: t('appearance.secretary.label'), value: t('appearance.secretary.value') },
        { label: t('appearance.beach.label'), value: t('appearance.beach.value') },
        { label: t('appearance.steampunk.label'), value: t('appearance.steampunk.value') },
        { label: t('appearance.princess.label'), value: t('appearance.princess.value') },
        { label: t('appearance.nympho.label'), value: t('appearance.nympho.value') },
        { label: t('appearance.domina.label'), value: t('appearance.domina.value') },
        { label: t('appearance.slave.label'), value: t('appearance.slave.value') },
    ];

    const location = [
        { label: t('location.bedroom.label'), value: t('location.bedroom.value') },
        { label: t('location.beach.label'), value: t('location.beach.value') },
        { label: t('location.penthouse.label'), value: t('location.penthouse.value') },
        { label: t('location.springs.label'), value: t('location.springs.value') },
        { label: t('location.office.label'), value: t('location.office.value') },
        { label: t('location.mansion.label'), value: t('location.mansion.value') },
        { label: t('location.plane.label'), value: t('location.plane.value') },
        { label: t('location.cabin.label'), value: t('location.cabin.value') },
        { label: t('location.sauna.label'), value: t('location.sauna.value') },
        { label: t('location.space.label'), value: t('location.space.value') },
        { label: t('location.dressing.label'), value: t('location.dressing.value') },
        { label: t('location.yacht.label'), value: t('location.yacht.value') },
        { label: t('location.dungeon.label'), value: t('location.dungeon.value') },
        { label: t('location.greenhouse.label'), value: t('location.greenhouse.value') },
        { label: t('location.roof.label'), value: t('location.roof.value') },
        { label: t('location.library.label'), value: t('location.library.value') },
        { label: t('location.train.label'), value: t('location.train.value') },
        { label: t('location.tent.label'), value: t('location.tent.value') },
        { label: t('location.studio.label'), value: t('location.studio.value') },
        { label: t('location.throne.label'), value: t('location.throne.value') },
        { label: t('location.club.label'), value: t('location.club.value') },
        { label: t('location.garage.label'), value: t('location.garage.value') },
        { label: t('location.elevator.label'), value: t('location.elevator.value') },
        { label: t('location.kitchen.label'), value: t('location.kitchen.value') },
    ];

    return { names, personality, situation, instructions, appearance, location };
};
