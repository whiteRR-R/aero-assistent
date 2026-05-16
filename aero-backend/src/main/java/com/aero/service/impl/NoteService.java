package com.aero.service.impl;

import com.aero.dto.request.NoteCategoryRequest;
import com.aero.dto.request.NoteRequest;
import com.aero.dto.response.NoteCategoryResponse;
import com.aero.dto.response.NoteResponse;
import com.aero.dto.response.PageResponse;
import com.aero.entity.Note;
import com.aero.entity.NoteCategory;
import com.aero.entity.User;
import com.aero.exception.ConflictException;
import com.aero.exception.NotFoundException;
import com.aero.mapper.NoteMapper;
import com.aero.repository.NoteCategoryRepository;
import com.aero.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository         noteRepo;
    private final NoteCategoryRepository categoryRepo;
    private final NoteMapper             noteMapper;

    

    @Transactional
    public NoteResponse create(Long userId, NoteRequest req) {
        Note note = noteMapper.toEntity(req);
        note.setUser(User.builder().id(userId).build());
        if (req.categoryId() != null) {
            note.setCategory(findCategory(userId, req.categoryId()));
        }
        return noteMapper.toResponse(noteRepo.save(note));
    }

    @Transactional(readOnly = true)
    public NoteResponse getById(Long userId, Long noteId) {
        return noteMapper.toResponse(findOwned(userId, noteId));
    }

    @Transactional(readOnly = true)
    public PageResponse<NoteResponse> list(Long userId, Long categoryId,
                                           Boolean pinned, int page, int size) {
        var pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "pinned")
                    .and(Sort.by(Sort.Direction.DESC, "updatedAt")));

        var p = (categoryId != null)
                ? noteRepo.findByUserIdAndCategoryId(userId, categoryId, pageable)
                : (Boolean.TRUE.equals(pinned))
                    ? noteRepo.findByUserIdAndPinnedTrue(userId, pageable)
                    : noteRepo.findByUserId(userId, pageable);

        return PageResponse.of(p.map(noteMapper::toResponse));
    }

    
    @Transactional(readOnly = true)
    public PageResponse<NoteResponse> search(Long userId, String query, int page, int size) {
        if (!StringUtils.hasText(query)) return list(userId, null, null, page, size);
        var pageable = PageRequest.of(page, size);
        return PageResponse.of(
                noteRepo.fullTextSearch(userId, query.trim(), pageable)
                        .map(noteMapper::toResponse));
    }

    @Transactional
    public NoteResponse update(Long userId, Long noteId, NoteRequest req) {
        Note note = findOwned(userId, noteId);
        noteMapper.updateFromRequest(req, note);
        if (req.categoryId() != null) {
            note.setCategory(findCategory(userId, req.categoryId()));
        } else if (req.categoryId() == null && note.getCategory() != null) {
            
            note.setCategory(null);
        }
        return noteMapper.toResponse(noteRepo.save(note));
    }

    @Transactional
    public NoteResponse togglePin(Long userId, Long noteId) {
        Note note = findOwned(userId, noteId);
        note.setPinned(!note.getPinned());
        return noteMapper.toResponse(noteRepo.save(note));
    }

    @Transactional
    public void delete(Long userId, Long noteId) {
        noteRepo.delete(findOwned(userId, noteId));
    }

    

    @Transactional
    public NoteCategoryResponse createCategory(Long userId, NoteCategoryRequest req) {
        if (categoryRepo.existsByUserIdAndName(userId, req.name())) {
            throw new ConflictException("Category already exists: " + req.name());
        }
        NoteCategory cat = NoteCategory.builder()
                .user(User.builder().id(userId).build())
                .name(req.name())
                .color(req.color())
                .build();
        return noteMapper.toCategoryResponse(categoryRepo.save(cat));
    }

    @Transactional(readOnly = true)
    public List<NoteCategoryResponse> listCategories(Long userId) {
        return categoryRepo.findByUserId(userId)
                .stream().map(noteMapper::toCategoryResponse).toList();
    }

    @Transactional
    public NoteCategoryResponse updateCategory(Long userId, Long catId, NoteCategoryRequest req) {
        NoteCategory cat = findCategory(userId, catId);
        if (!cat.getName().equals(req.name()) &&
                categoryRepo.existsByUserIdAndName(userId, req.name())) {
            throw new ConflictException("Category name already exists: " + req.name());
        }
        cat.setName(req.name());
        cat.setColor(req.color());
        return noteMapper.toCategoryResponse(categoryRepo.save(cat));
    }

    @Transactional
    public void deleteCategory(Long userId, Long catId) {
        categoryRepo.delete(findCategory(userId, catId));
        
    }

    

    private Note findOwned(Long userId, Long noteId) {
        return noteRepo.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> NotFoundException.of("Note", noteId));
    }

    private NoteCategory findCategory(Long userId, Long catId) {
        return categoryRepo.findByIdAndUserId(catId, userId)
                .orElseThrow(() -> NotFoundException.of("NoteCategory", catId));
    }
}
