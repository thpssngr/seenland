export const lakes = [
  {
    id: "pilsensee",
    name: "Pilsensee",
    image: require("../../assets/images/pilsensee.jpg"),
    outline: require("../../assets/images/pilsensee-outline.png"),
  },
  {
    id: "woerthsee",
    name: "Wörthsee",
    image: require("../../assets/images/woerthsee.jpg"),
    outline: require("../../assets/images/woerthsee-outline.png"),
  },
  {
    id: "ammersee",
    name: "Ammersee",
    image: require("../../assets/images/ammersee.jpg"),
    outline: require("../../assets/images/ammersee-outline.png"),
  },
  {
    id: "starnbergersee",
    name: "Starnberger See",
    image: require("../../assets/images/starnbergersee.jpg"),
    outline: require("../../assets/images/starnbergersee-outline.png"),
  },
];

export const lakeName = (id) => lakes.find((l) => l.id === id)?.name ?? id;

// Favorit zuerst, Rest in Originalreihenfolge
export const sortByFavorite = (favorite) => {
  const fav = lakes.find((l) => l.id === favorite);
  if (!fav) return lakes;
  return [fav, ...lakes.filter((l) => l.id !== favorite)];
};
