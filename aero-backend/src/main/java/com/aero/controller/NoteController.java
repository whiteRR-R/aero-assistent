package com.aero.controller;

import com.aero.dto.request.NoteCategoryRequest;
import com.aero.dto.request.NoteRequest;
import com.aero.dto.response.NoteCategoryResponse;
import com.aero.dto.response.NoteResponse;
import com.aero.dto.response.PageResponse;
import com.aero.security.SecurityUtil;
import com.aero.service.impl.NoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notes")
@RequiredArgsConstructor
@Tag(name = "Notes", description = "Personal notes with full-text search and categories")
public class NoteController {

    private final NoteService noteService;

    

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a note")
    public NoteResponse create(@Valid @RequestBody NoteRequest req) {
        return noteService.create(SecurityUtil.currentUserId(), req);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get note by ID")
    public NoteResponse getById(@PathVariable Long id) {
        return noteService.getById(SecurityUtil.currentUserId(), id);
    }

    @GetMapping
    @Operation(summary = "List notes (filter by category or pinned)")
    public PageResponse<NoteResponse> list(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean pinned,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return noteService.list(SecurityUtil.currentUserId(),
                categoryId, pinned, page, size);
    }

    @GetMapping("/search")
    @Operation(summary = "Full-text search across note title and content")
    public PageResponse<NoteResponse> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return noteService.search(SecurityUtil.currentUserId(), q, page, size);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Replace a note")
    public NoteResponse update(@PathVariable Long id,
                               @Valid @RequestBody NoteRequest req) {
        return noteService.update(SecurityUtil.currentUserId(), id, req);
    }

    @PostMapping("/{id}/pin")
    @Operation(summary = "Toggle pin status of a note")
    public NoteResponse togglePin(@PathVariable Long id) {
        return noteService.togglePin(SecurityUtil.currentUserId(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a note")
    public void delete(@PathVariable Long id) {
        noteService.delete(SecurityUtil.currentUserId(), id);
    }

    

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a note category")
    public NoteCategoryResponse createCategory(@Valid @RequestBody NoteCategoryRequest req) {
        return noteService.createCategory(SecurityUtil.currentUserId(), req);
    }

    @GetMapping("/categories")
    @Operation(summary = "List all note categories")
    public List<NoteCategoryResponse> listCategories() {
        return noteService.listCategories(SecurityUtil.currentUserId());
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Update a category")
    public NoteCategoryResponse updateCategory(@PathVariable Long id,
                                               @Valid @RequestBody NoteCategoryRequest req) {
        return noteService.updateCategory(SecurityUtil.currentUserId(), id, req);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a category (notes keep their content)")
    public void deleteCategory(@PathVariable Long id) {
        noteService.deleteCategory(SecurityUtil.currentUserId(), id);
    }
}
