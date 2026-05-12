import 'package:flutter/material.dart';
import 'dart:ui';
import '../models/channel.dart';
import '../services/api_service.dart';
import 'player_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService apiService = ApiService();
  List<Channel> allChannels = [];
  String searchQuery = "";

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF101010), // Gris anthracite profond (Netflix style)
      extendBodyBehindAppBar: true,
      appBar: _buildNetflixAppBar(),
      body: FutureBuilder<List<Channel>>(
        future: allChannels.isEmpty ? apiService.fetchChannels() : Future.value(allChannels),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Color(0xFFE50914)));
          }
          if (snapshot.hasError) return Center(child: Text("Erreur: ${snapshot.error}"));

          if (allChannels.isEmpty) {
            allChannels = snapshot.data ?? [];
          }

          if (allChannels.isEmpty) return const Center(child: Text("Aucune chaîne disponible."));

          // On organise les données pour l'UI
          Channel heroChannel = allChannels.first;
          Map<String, List<Channel>> groupedChannels = _groupChannelsByGroup(allChannels);

          return CustomScrollView(
            slivers: [
              // 1. LE HERO HEADER IMMERSIF (Vignette géante + dégradé)
              SliverToBoxAdapter(
                child: _buildHeroHeader(heroChannel),
              ),

              // 2. LES RANGÉES HORIZONTALES (H-Rows) PAR CATÉGORIE
              SliverPadding(
                padding: const EdgeInsets.only(top: 20, bottom: 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      String groupName = groupedChannels.keys.elementAt(index);
                      List<Channel> channelsInGroup = groupedChannels[groupName]!;
                      return _buildChannelRow(groupName, channelsInGroup);
                    },
                    childCount: groupedChannels.length,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  PreferredSizeWidget _buildNetflixAppBar() {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      title: const Text(
        "WOC TV",
        style: TextStyle(color: Color(0xFFE50914), fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -1.5),
      ),
      actions: [
        IconButton(icon: const Icon(Icons.search, color: Colors.white), onPressed: () {}),
        const SizedBox(width: 10),
        const CircleAvatar(backgroundColor: Colors.grey, radius: 15, child: Icon(Icons.person, size: 20, color: Colors.white)),
        const SizedBox(width: 20),
      ],
    );
  }

  Widget _buildHeroHeader(Channel channel) {
    return Stack(
      children: [
        // Image de fond avec gradient sombre
        Container(
          height: 550,
          width: double.infinity,
          decoration: BoxDecoration(
            image: DecorationImage(
              image: channel.logo != null && channel.logo!.isNotEmpty ? NetworkImage(channel.logo!) : const NetworkImage('https://via.placeholder.com/1920x1080?text=WOC+TV'),
              fit: BoxFit.cover,
            ),
          ),
        ),
        // Gradient pour noircir le bas de l'image (immerge le texte)
        Container(
          height: 550,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.black54, Colors.transparent, Color(0xFF101010)],
              stops: [0.0, 0.5, 1.0],
            ),
          ),
        ),
        // Contenu du Hero (Texte + Boutons)
        Positioned(
          bottom: 40,
          left: 30,
          right: 30,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                channel.name.toUpperCase(),
                style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w900, letterSpacing: -2),
              ),
              const SizedBox(height: 10),
              Text(
                channel.group ?? "Chaîne en direct",
                style: const TextStyle(color: Colors.white70, fontSize: 16),
              ),
              const SizedBox(height: 25),
              Row(
                children: [
                  ElevatedButton.icon(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PlayerScreen(channel: channel))),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4))),
                    icon: const Icon(Icons.play_arrow, size: 30),
                    label: const Text("Lecture", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(width: 15),
                  ElevatedButton.icon(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.white24, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4))),
                    icon: const Icon(Icons.info_outline),
                    label: const Text("Infos", style: TextStyle(fontSize: 18)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildChannelRow(String title, List<Channel> channels) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 20, top: 20, bottom: 10),
          child: Text(title, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
        ),
        SizedBox(
          height: 160, // Hauteur de la rangée (adaptée au 16:9)
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            itemCount: channels.length,
            itemBuilder: (context, index) {
              return _buildNetflixCard(channels[index]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildNetflixCard(Channel channel) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PlayerScreen(channel: channel))),
        child: Container(
          width: 250, // Largeur fixe pour le format 16:9
          margin: const EdgeInsets.symmetric(horizontal: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(6), // Coins arrondis
                    image: DecorationImage(
                      image: channel.logo != null && channel.logo!.isNotEmpty ? NetworkImage(channel.logo!) : const NetworkImage('https://via.placeholder.com/300x168?text=WOC+TV'),
                      fit: BoxFit.cover, // Remplit sans couper de manière agressive
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                channel.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Map<String, List<Channel>> _groupChannelsByGroup(List<Channel> channels) {
    Map<String, List<Channel>> grouped = {};
    for (var channel in channels) {
      String group = channel.group ?? "Autres chaînes";
      if (!grouped.containsKey(group)) {
        grouped[group] = [];
      }
      grouped[group]!.add(channel);
    }
    return grouped;
  }
}